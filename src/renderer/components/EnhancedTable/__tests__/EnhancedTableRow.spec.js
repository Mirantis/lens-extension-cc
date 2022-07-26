import mockConsole from 'jest-mock-console';
import { render, screen, sleep } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { EnhancedTableRow } from '../EnhancedTableRow';
import {
  Cloud,
  mkCloudJson,
  CONNECTION_STATUSES,
} from '../../../../common/Cloud'; // MOCKED
import { CloudProvider, useClouds } from '../../../store/CloudProvider';
import { IpcRenderer } from '../../../IpcRenderer';
import { CloudStore } from '../../../../store/CloudStore';
import {
  ConfirmDialog,
  Util,
} from '../../../../../__mocks__/@k8slens/extensions';
import * as strings from '../../../../strings';

jest.mock('../../../../common/Cloud');

describe('/renderer/components/EnhancedTable/EnhancedTable', () => {
  const extension = {};
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

    IpcRenderer.createInstance(extension);
  });

  describe('render', () => {
    let fakeCloudFoo,
      fakeCloudFooJson,
      fakeCloudWithoutNamespaces,
      fakeCloudWithoutNamespacesJson;

    beforeEach(() => {
      fakeCloudFooJson = mkCloudJson({
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

      fakeCloudWithoutNamespacesJson = mkCloudJson({
        name: 'bar',
        cloudUrl: 'http://bar.com',
        loaded: true,
        connected: true,
        status: CONNECTION_STATUSES.DISCONNECTED,
      });

      fakeCloudFoo = new Cloud(fakeCloudFooJson);
      fakeCloudWithoutNamespaces = new Cloud(fakeCloudWithoutNamespacesJson);

      CloudStore.createInstance().loadExtension(extension);
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

    it('show warning icon by checking synchronize future projects checkbox', async () => {
      render(
        <CloudProvider>
          <table>
            <tbody>
              <EnhancedTableRow
                cloud={fakeCloudFoo}
                withCheckboxes={true}
                isSyncStarted={false}
                getDataToSync={() => {}}
                namespaces={fakeCloudFoo.namespaces}
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

      const warningBlock = document.querySelector(
        'i[material="warning_amber"]'
      ).parentNode;

      expect(warningBlock).toHaveStyle('opacity: 0');

      await user.click(
        screen.getByText(strings.synchronizeBlock.synchronizeFutureProjects())
      );
      expect(warningBlock).toHaveStyle('opacity: 1');
    });
  });

  describe('getCloudMenuItems()', () => {
    let fakeCloudJson,
      fakeCloudWithoutNamespacesJson,
      disconnectedFakeCloudJson;

    const Table = () => {
      const { clouds } = useClouds();

      return (
        <>
          <table>
            <tbody>
              {Object.values(clouds).map((cloud) => (
                <EnhancedTableRow
                  key={cloud.name}
                  cloud={cloud}
                  withCheckboxes={false}
                  isSyncStarted={false}
                  getDataToSync={() => {}}
                  namespaces={cloud.namespaces}
                  status={{
                    cloudStatus:
                      strings.connectionStatuses.cloud.disconnected(),
                    namespaceStatus:
                      strings.connectionStatuses.namespace.disconnected(),
                    styles: colorGray,
                  }}
                />
              ))}
            </tbody>
          </table>
        </>
      );
    };

    beforeEach(() => {
      fakeCloudJson = mkCloudJson({
        name: 'bar',
        cloudUrl: 'http://bar.com',
        status: CONNECTION_STATUSES.CONNECTED,
        syncedProjects: ['bar namespace'],
        namespaces: [
          {
            cloudUrl: 'https://bar.com',
            clusterCount: 4,
            credentialCount: 4,
            licenseCount: 1,
            machineCount: 12,
            name: 'bar namespace',
            proxyCount: 0,
            sshKeyCount: 2,
            synced: true,
          },
        ],
      });

      fakeCloudWithoutNamespacesJson = mkCloudJson({
        name: 'bar',
        cloudUrl: 'http://bar.com',
        loaded: true,
        connected: true,
        status: CONNECTION_STATUSES.DISCONNECTED,
        namespaces: [],
      });

      disconnectedFakeCloudJson = mkCloudJson({
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
            name: 'foo namespace',
            proxyCount: 0,
            sshKeyCount: 2,
            synced: false,
          },
        ],
      });
    });

    it('triggers reconnect cloud action by clicking on "Reconnect" button', async () => {
      CloudStore.initStore('cloud-store', {
        clouds: {
          'http://foo.com': disconnectedFakeCloudJson,
        },
      });
      CloudStore.createInstance().loadExtension(extension);

      render(
        <CloudProvider>
          <Table />
        </CloudProvider>
      );

      await user.click(screen.getByText('Reconnect'));
      await sleep(10);

      expect(screen.getByText('http://foo.com')).toBeInTheDocument();
    });

    it('cloud |without| namespaces: triggers remove cloud action by clicking on "Remove" button', async () => {
      CloudStore.initStore('cloud-store', {
        clouds: {
          'http://bar.com': fakeCloudWithoutNamespacesJson,
        },
      });
      CloudStore.createInstance().loadExtension(extension);

      render(
        <CloudProvider>
          <Table />
        </CloudProvider>
      );

      await user.click(screen.getByText('Remove'));
      await sleep(10);

      expect(screen.queryByText('http://bar.com')).not.toBeInTheDocument();
    });

    it('cloud |with| namespaces: triggers remove cloud action by clicking on "Remove" button', async () => {
      CloudStore.initStore('cloud-store', {
        clouds: {
          'http://bar.com': fakeCloudJson,
        },
      });
      CloudStore.createInstance().loadExtension(extension);

      render(
        <CloudProvider>
          <ConfirmDialog />
          <Table />
        </CloudProvider>
      );

      await user.click(screen.getByText('Remove'));
      await sleep(10);

      await user.click(document.querySelector('.confirm-buttons .ok'));
      expect(screen.queryByText('http://bar.com')).not.toBeInTheDocument();
    });

    it('triggers open in browser action by clicking on "Open in browser" button', async () => {
      CloudStore.initStore('cloud-store', {
        clouds: {
          'http://bar.com': fakeCloudJson,
        },
      });
      CloudStore.createInstance().loadExtension(extension);

      render(
        <CloudProvider>
          <Util />
          <Table />
        </CloudProvider>
      );

      await user.click(screen.getByText('Open in browser'));
      expect(
        screen.getByText(`External url: ${fakeCloudJson.cloudUrl}`)
      ).toBeInTheDocument();
    });
  });
});
