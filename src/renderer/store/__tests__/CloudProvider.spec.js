import { render, screen, act } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import mockConsole from 'jest-mock-console';
import { expectErrorBoundary } from '../../../../tools/tests/testTools';
import { useClouds, CloudProvider } from '../CloudProvider';
import { globalCloudStore } from '../../../store/CloudStore';
import { Cloud, mkCloudJson, CONNECTION_STATUSES } from '../../../common/Cloud'; // MOCKED
import { IpcRenderer } from '../../IpcRenderer';

jest.mock('../../../common/Cloud');

describe('/renderer/store/CloudProvider', () => {
  const extension = {};
  let user;
  let ipcRenderer;

  beforeEach(() => {
    user = userEvent.setup();
    mockConsole(['log', 'info', 'warn']); // automatically restored after each test
  });

  describe('useClouds()', () => {
    describe('actions', () => {
      let fakeFooCloudJson;
      let fakeBarCloud;

      const TestComponent = ({ cloudToAdd }) => {
        const { clouds, actions: cloudActions } = useClouds();

        const handleAddCloud = (cloud) => {
          cloudActions.addCloud(cloud);
        };

        const handleRemoveCloud = (cloudUrl) => {
          cloudActions.removeCloud(cloudUrl);
        };

        return (
          <div>
            <div>
              {Object.keys(clouds).map((cloudUrl) => (
                <div key={cloudUrl}>
                  <div>{cloudUrl}</div>
                  <div
                    className="remove-cloud"
                    onClick={() => handleRemoveCloud(cloudUrl)}
                  >
                    Remove cloud
                  </div>
                </div>
              ))}
            </div>

            {cloudToAdd && (
              <div onClick={() => handleAddCloud(cloudToAdd)}>Add cloud</div>
            )}
          </div>
        );
      };

      beforeEach(() => {
        fakeFooCloudJson = mkCloudJson({
          __mockStatus: CONNECTION_STATUSES.CONNECTED,
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

        fakeBarCloud = new Cloud({
          __mockStatus: CONNECTION_STATUSES.DISCONNECTED,
          name: 'bar',
          cloudUrl: 'http://bar.com',
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

        ipcRenderer = IpcRenderer.createInstance(extension);
        globalCloudStore.loadExtension(extension, { ipcRenderer });
        globalCloudStore.fromStore({
          clouds: {
            'http://foo.com': fakeFooCloudJson,
          },
        });
      });

      describe('cloudActions.removeCloud()', () => {
        it('remove cloud from store by clicking remove button', async () => {
          render(
            <CloudProvider>
              <TestComponent />
            </CloudProvider>
          );

          const cloudName = 'http://foo.com';

          expect(screen.getByText(cloudName)).toBeInTheDocument();

          await act(
            async () =>
              await user.click(
                screen
                  .getByText(cloudName)
                  .parentNode.querySelector('.remove-cloud')
              )
          );
          expect(screen.queryByText(cloudName)).not.toBeInTheDocument();
        });
      });

      describe('cloudActions.addCloud()', () => {
        it('add cloud to store by clicking add button', async () => {
          render(
            <CloudProvider>
              <TestComponent cloudToAdd={fakeBarCloud} />
            </CloudProvider>
          );

          const cloudName = 'http://bar.com';

          expect(screen.queryByText(cloudName)).not.toBeInTheDocument();

          await act(
            async () => await user.click(screen.getByText('Add cloud'))
          );
          expect(screen.getByText(cloudName)).toBeInTheDocument();
        });
      });
    });

    describe('errors', () => {
      it('triggers an error, when useClouds not in CloudProvider', () => {
        const ComponentThatThrowError = () => {
          useClouds();
        };
        expectErrorBoundary(
          <ComponentThatThrowError />,
          'useClouds must be used within an CloudProvider'
        );
      });
    });
  });
});
