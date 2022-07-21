import mockConsole from 'jest-mock-console';
import { render, screen, sleep } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { TableRowListenerWrapper } from '../TableRowListenerWrapper';
import { Cloud } from '../../../../common/__tests__/MockCloud';
import { CONNECTION_STATUSES, CLOUD_EVENTS } from '../../../../common/Cloud';
import { CloudProvider } from '../../../store/CloudProvider';
import { IpcRenderer } from '../../../IpcRenderer';
import { CloudStore } from '../../../../store/CloudStore';
import * as strings from '../../../../strings';

describe('/renderer/components/EnhancedTable/TableRowListenerWrapper', () => {
  const extension = {};
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    mockConsole(); // automatically restored after each test

    IpcRenderer.createInstance(extension);
    CloudStore.createInstance().loadExtension(extension);
  });

  const disconnectedFakeCloud = new Cloud('https://foo.com', {
    name: 'foo',
    cloudUrl: 'http://foo.com',
    status: CONNECTION_STATUSES.DISCONNECTED,
    namespaces: [
      {
        cloudUrl: 'https://foo.com',
        clusterCount: 4,
        credentialCount: 4,
        licenseCount: 1,
        machineCount: 12,
        name: 'foo',
        proxyCount: 0,
        sshKeyCount: 2,
        synced: true,
      },
    ],
    syncedNamespaces: [
      {
        cloudUrl: 'https://foo.com',
        clusterCount: 4,
        credentialCount: 4,
        licenseCount: 1,
        machineCount: 12,
        name: 'foo',
        proxyCount: 0,
        sshKeyCount: 2,
        synced: true,
      },
    ],
  });

  const connectingFakeCloud = new Cloud('http://bar.com', {
    name: 'bar',
    cloudUrl: 'http://bar.com',
    status: CONNECTION_STATUSES.CONNECTING,
    namespaces: [
      {
        cloudUrl: 'https://bar.com',
        clusterCount: 4,
        credentialCount: 4,
        licenseCount: 1,
        machineCount: 12,
        name: 'bar',
        proxyCount: 0,
        sshKeyCount: 2,
        synced: true,
      },
    ],
    syncedNamespaces: [
      {
        cloudUrl: 'https://bar.com',
        clusterCount: 4,
        credentialCount: 4,
        licenseCount: 1,
        machineCount: 12,
        name: 'bar',
        proxyCount: 0,
        sshKeyCount: 2,
        synced: true,
      },
    ],
  });

  const connectedFakeCloud = new Cloud('http://foobar.com', {
    name: 'foobar',
    cloudUrl: 'http://foobar.com',
    status: CONNECTION_STATUSES.CONNECTED,
    namespaces: [
      {
        cloudUrl: 'https://foobar.com',
        clusterCount: 4,
        credentialCount: 4,
        licenseCount: 1,
        machineCount: 12,
        name: 'foobar',
        proxyCount: 0,
        sshKeyCount: 2,
        synced: true,
      },
    ],
    syncedNamespaces: [
      {
        cloudUrl: 'https://foobar.com',
        clusterCount: 4,
        credentialCount: 4,
        licenseCount: 1,
        machineCount: 12,
        name: 'foobar',
        proxyCount: 0,
        sshKeyCount: 2,
        synced: true,
      },
    ],
  });

  [disconnectedFakeCloud, connectingFakeCloud, connectedFakeCloud].forEach(
    (cloud) => {
      it(`renders a table row with |${cloud.status}| cloud status`, () => {
        render(
          <CloudProvider>
            <table>
              <tbody>
                <TableRowListenerWrapper
                  cloud={cloud}
                  withCheckboxes={false}
                  isSyncStarted={false}
                  getDataToSync={() => {}}
                />
              </tbody>
            </table>
          </CloudProvider>
        );

        if (cloud.status === CONNECTION_STATUSES.DISCONNECTED) {
          expect(
            screen.getByText(strings.connectionStatuses.cloud.disconnected())
          ).toBeInTheDocument();
        } else if (cloud.status === CONNECTION_STATUSES.CONNECTING) {
          expect(
            screen.getByText(strings.connectionStatuses.cloud.connecting())
          ).toBeInTheDocument();
        } else if (cloud.status === CONNECTION_STATUSES.CONNECTED) {
          expect(
            screen.getByText(strings.connectionStatuses.cloud.connected())
          ).toBeInTheDocument();
        }
      });
    }
  );

  it('renders a table row when cloud is fetching', () => {
    const fetchingFakeCloud = new Cloud('http://barfoo.com', {
      name: 'barfoo',
      cloudUrl: 'http://barfoo.com',
      fetching: true,
      namespaces: [
        {
          cloudUrl: 'https://barfoo.com',
          clusterCount: 4,
          credentialCount: 4,
          licenseCount: 1,
          machineCount: 12,
          name: 'barfoo',
          proxyCount: 0,
          sshKeyCount: 2,
          synced: true,
        },
      ],
      syncedNamespaces: [
        {
          cloudUrl: 'https://barfoo.com',
          clusterCount: 4,
          credentialCount: 4,
          licenseCount: 1,
          machineCount: 12,
          name: 'barfoo',
          proxyCount: 0,
          sshKeyCount: 2,
          synced: true,
        },
      ],
    });

    render(
      <CloudProvider>
        <table>
          <tbody>
            <TableRowListenerWrapper
              cloud={fetchingFakeCloud}
              withCheckboxes={false}
              isSyncStarted={false}
              getDataToSync={() => {}}
            />
          </tbody>
        </table>
      </CloudProvider>
    );

    expect(
      screen.getByText(strings.connectionStatuses.cloud.updating())
    ).toBeInTheDocument();
  });

  [CLOUD_EVENTS.STATUS_CHANGE, CLOUD_EVENTS.FETCHING_CHANGE].forEach(
    (event) => {
      it(`triggers |${
        event === CLOUD_EVENTS.STATUS_CHANGE
          ? 'onCloudStatusChange()'
          : 'onCloudFetchingChange()'
      }| by dispatching |${event}| event`, async () => {
        const fakeCloud = new Cloud('http://barfoo.com', {
          name: 'barfoo',
          cloudUrl: 'http://barfoo.com',
          status: CONNECTION_STATUSES.DISCONNECTED,
          fetching: true,
          syncedProjects: ['barfoo'],
          namespaces: [
            {
              cloudUrl: 'https://barfoo.com',
              clusterCount: 4,
              credentialCount: 4,
              licenseCount: 1,
              machineCount: 12,
              name: 'namespace 1',
              proxyCount: 0,
              sshKeyCount: 2,
              synced: true,
            },
          ],
          syncedNamespaces: [
            {
              cloudUrl: 'https://barfoo.com',
              clusterCount: 4,
              credentialCount: 4,
              licenseCount: 1,
              machineCount: 12,
              name: 'namespace 1',
              proxyCount: 0,
              sshKeyCount: 2,
              synced: true,
            },
          ],
        });

        render(
          <CloudProvider>
            <table>
              <tbody>
                <TableRowListenerWrapper
                  cloud={fakeCloud}
                  withCheckboxes={false}
                  isSyncStarted={false}
                  getDataToSync={() => {}}
                />
              </tbody>
            </table>
          </CloudProvider>
        );

        if (event === CLOUD_EVENTS.STATUS_CHANGE) {
          fakeCloud.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE);
        } else {
          fakeCloud.dispatchEvent(CLOUD_EVENTS.FETCHING_CHANGE);
        }

        await sleep(10);
        expect(
          screen.getByText(strings.connectionStatuses.cloud.updating())
        ).toBeInTheDocument();
      });
    }
  );

  it('triggers |onCloudSyncChange()| by dispatching |syncChange| event', async () => {
    const fakeCloud = new Cloud('http://barfoo.com', {
      name: 'barfoo',
      cloudUrl: 'http://barfoo.com',
      status: CONNECTION_STATUSES.DISCONNECTED,
      fetching: true,
      syncedProjects: ['barfoo'],
      namespaces: [
        {
          cloudUrl: 'https://barfoo.com',
          clusterCount: 4,
          credentialCount: 4,
          licenseCount: 1,
          machineCount: 12,
          name: 'namespace 1',
          proxyCount: 0,
          sshKeyCount: 2,
          synced: true,
        },
      ],
      syncedNamespaces: [
        {
          cloudUrl: 'https://barfoo.com',
          clusterCount: 4,
          credentialCount: 4,
          licenseCount: 1,
          machineCount: 12,
          name: 'namespace 1',
          proxyCount: 0,
          sshKeyCount: 2,
          synced: true,
        },
      ],
    });

    render(
      <CloudProvider>
        <table>
          <tbody>
            <TableRowListenerWrapper
              cloud={fakeCloud}
              withCheckboxes={false}
              isSyncStarted={false}
              getDataToSync={() => {}}
            />
          </tbody>
        </table>
      </CloudProvider>
    );

    fakeCloud.dispatchEvent(CLOUD_EVENTS.SYNC_CHANGE);

    await user.click(
      document.querySelector('i[material="chevron_right"]').parentNode
    );

    await sleep(10);
    expect(screen.getByText(fakeCloud.namespaces[0].name)).toBeInTheDocument();
  });
});
