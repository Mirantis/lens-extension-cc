import mockConsole from 'jest-mock-console';
import { render, screen, sleep } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { EnhancedTableRow } from '../EnhancedTableRow';
import { Cloud } from '../../../../common/__tests__/MockCloud';
import { CloudProvider } from '../../../store/CloudProvider';
import { IpcRenderer } from '../../../IpcRenderer';
import { CloudStore } from '../../../../store/CloudStore';
import * as strings from '../../../../strings';

describe('/renderer/components/EnhancedTable/EnhancedTable', () => {
  const extension = {};
  let fakeCloudFoo;
  let fakeCloudWithoutNamespaces;
  let user;

  const colorGreen = {
    color: 'var(--colorSuccess)',
  };

  const colorGray = {
    color: 'var(--halfGray)',
  };

  beforeEach(() => {
    user = userEvent.setup();
    mockConsole(); // automatically restored after each test

    fakeCloudWithoutNamespaces = new Cloud('http://bar.com', {
      name: 'bar',
      cloudUrl: 'http://bar.com',
      loaded: true,
      connected: true,
      username: null,
      id_token: null,
      expires_in: null,
      syncAll: false,
      tokenExpiresAt: null,
      _tokenValidTill: null,
      refresh_token: null,
      refresh_expires_in: null,
      refreshExpiresAt: null,
      _refreshValidTill: null,
      namespaces: [],
    });

    IpcRenderer.createInstance(extension);
    CloudStore.initStore('cloud-store', {
      clouds: {
        'http://bar.com': fakeCloudWithoutNamespaces,
      },
    });
    CloudStore.createInstance().loadExtension(extension);

    fakeCloudFoo = new Cloud('http://foo.com', {
      name: 'foo',
      cloudUrl: 'http://foo.com',
      namespaces: [
        {
          cloudUrl: 'https://foo.com',
          clusterCount: 4,
          credentialCount: 4,
          licenseCount: 1,
          machineCount: 12,
          name: 'foo namespace',
          proxyCount: 0,
          sshKeyCount: 2,
          synced: true,
        },
      ],
    });
  });

  [true, false].forEach((isSyncStarted) => {
    [true, false].forEach((withCheckboxes) => {
      it(`renders a table row, when isSyncStarted=|${isSyncStarted}| and withCheckboxes=|${withCheckboxes}|`, () => {
        render(
          <CloudProvider>
            <table>
              <tbody>
                <EnhancedTableRow
                  cloud={fakeCloudFoo}
                  withCheckboxes={withCheckboxes}
                  isSyncStarted={isSyncStarted}
                  getDataToSync={() => {}}
                  namespaces={fakeCloudFoo.namespaces}
                  status={{
                    cloudStatus: strings.connectionStatuses.cloud.connected(),
                    namespaceStatus:
                      strings.connectionStatuses.namespace.connected(),
                    styles: colorGreen,
                  }}
                />
              </tbody>
            </table>
          </CloudProvider>
        );

        expect(screen.getByText(fakeCloudFoo.cloudUrl)).toBeInTheDocument();

        if (withCheckboxes) {
          expect(
            document.querySelector('input[type="checkbox"]')
          ).toBeInTheDocument();
        } else {
          expect(
            document.querySelector('input[type="checkbox"]')
          ).not.toBeInTheDocument();
        }
      });
    });
  });

  it('open namespaces row by clicking on expand button', async () => {
    render(
      <CloudProvider>
        <table>
          <tbody>
            <EnhancedTableRow
              cloud={fakeCloudFoo}
              withCheckboxes={false}
              isSyncStarted={false}
              getDataToSync={() => {}}
              namespaces={fakeCloudFoo.namespaces}
              status={{
                cloudStatus: strings.connectionStatuses.cloud.connected(),
                namespaceStatus:
                  strings.connectionStatuses.namespace.connected(),
                styles: colorGreen,
              }}
            />
          </tbody>
        </table>
      </CloudProvider>
    );

    expect(screen.queryByText('foo namespace')).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        `${strings.managementClusters.table.tbodyDetailedInfo.clusters()} (${
          fakeCloudFoo.namespaces[0].clusterCount
        })`
      )
    ).not.toBeInTheDocument();

    await user.click(
      document.querySelector('i[material="chevron_right"]').parentNode
    );
    expect(screen.getByText('foo namespace')).toBeInTheDocument();

    await user.click(
      screen.getByText('foo namespace').parentNode.querySelector('button')
    );
    expect(
      screen.getByText(
        `${strings.managementClusters.table.tbodyDetailedInfo.clusters()} (${
          fakeCloudFoo.namespaces[0].clusterCount
        })`
      )
    ).toBeInTheDocument();
  });

  it('renders a table row without namespaces', () => {
    render(
      <CloudProvider>
        <table>
          <tbody>
            <EnhancedTableRow
              cloud={fakeCloudWithoutNamespaces}
              withCheckboxes={false}
              isSyncStarted={false}
              getDataToSync={() => {}}
              namespaces={fakeCloudWithoutNamespaces.namespaces}
              status={{
                cloudStatus: strings.connectionStatuses.cloud.disconnected(),
                namespaceStatus:
                  strings.connectionStatuses.namespace.disconnected(),
                styles: colorGray,
              }}
            />
          </tbody>
        </table>
      </CloudProvider>
    );

    // it means that we shouldn't have chevron_right icon
    expect(
      document.querySelector('i[material="chevron_right"]')
    ).not.toBeInTheDocument();
  });

  it('renders', async () => {
    render(
      <CloudProvider>
        <table>
          <tbody>
            <EnhancedTableRow
              cloud={fakeCloudWithoutNamespaces}
              withCheckboxes={false}
              isSyncStarted={false}
              getDataToSync={() => {}}
              namespaces={fakeCloudWithoutNamespaces.namespaces}
              status={{
                cloudStatus: strings.connectionStatuses.cloud.disconnected(),
                namespaceStatus:
                  strings.connectionStatuses.namespace.disconnected(),
                styles: colorGray,
              }}
            />
          </tbody>
        </table>
      </CloudProvider>
    );

    await user.click(screen.getByText('Remove'));
    await sleep(10);

    expect(screen.queryByText('http://bar.com')).not.toBeInTheDocument();
  });
});
