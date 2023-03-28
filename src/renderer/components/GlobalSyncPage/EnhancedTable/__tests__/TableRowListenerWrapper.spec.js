import mockConsole from 'jest-mock-console';
import { render, screen, sleep, act } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { TableRowListenerWrapper } from '../TableRowListenerWrapper';
import {
  Cloud,
  CONNECTION_STATUSES,
  CLOUD_EVENTS,
} from '../../../../../common/Cloud'; // MOCKED
import { CloudProvider } from '../../../../store/CloudProvider';
import { IpcRenderer } from '../../../../IpcRenderer';
import { globalCloudStore } from '../../../../../store/CloudStore';
import * as strings from '../../../../../strings';

jest.mock('../../../../../common/Cloud');

describe('/renderer/components/GlobalSyncPage/EnhancedTable/TableRowListenerWrapper', () => {
  const extension = {};
  let user;
  let ipcRenderer;

  beforeEach(() => {
    user = userEvent.setup();
    mockConsole(['log', 'info', 'warn']); // automatically restored after each test

    ipcRenderer = IpcRenderer.createInstance(extension);
    globalCloudStore.loadExtension(extension, { ipcRenderer });
  });

  (function () {
    const disconnectedFakeCloud = new Cloud({
      name: 'foo',
      cloudUrl: 'http://foo.com',
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
    });

    const connectingFakeCloud = new Cloud({
      __mockStatus: CONNECTION_STATUSES.CONNECTING,
      name: 'bar',
      cloudUrl: 'http://bar.com',
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
    });

    const connectedFakeCloud = new Cloud({
      __mockStatus: CONNECTION_STATUSES.CONNECTED,
      name: 'foobar',
      cloudUrl: 'http://foobar.com',
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
  })();

  it('renders a table row when cloud is fetching', () => {
    const fetchingFakeCloud = new Cloud({
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
        const fakeCloud = new Cloud({
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
    const fakeCloud = new Cloud({
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

    await act(
      async () =>
        await user.click(
          document.querySelector('i[material="chevron_right"]').parentNode
        )
    );

    await sleep(10);
    expect(screen.getByText(fakeCloud.namespaces[0].name)).toBeInTheDocument();
  });
});
