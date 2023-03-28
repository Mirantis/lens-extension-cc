import mockConsole from 'jest-mock-console';
import { render, screen, sleep, act } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { Renderer } from '@k8slens/extensions';
import { CloudProvider } from '../../../store/CloudProvider';
import { IpcRenderer } from '../../../IpcRenderer';
import { globalCloudStore } from '../../../../store/CloudStore';
import { mkCloudJson, CONNECTION_STATUSES } from '../../../../common/Cloud'; // MOCKED
import { SyncView } from '../SyncView';

jest.mock('../../../../common/Cloud');

const {
  Component: { ConfirmDialog },
} = Renderer;

describe('/renderer/components/GlobalSyncPage/SyncView', () => {
  const extension = {};
  let user;
  let ipcRenderer;

  beforeEach(() => {
    user = userEvent.setup();
    mockConsole(['log', 'info', 'warn']); // automatically restored after each test

    ipcRenderer = IpcRenderer.createInstance(extension);
    globalCloudStore.loadExtension(extension, { ipcRenderer });
  });

  describe('getCloudMenuItems()', () => {
    let fakeCloudJson;
    let fakeCloudWithoutNamespacesJson;
    let disconnectedFakeCloudJson;

    beforeEach(() => {
      fakeCloudJson = mkCloudJson({
        __mockStatus: CONNECTION_STATUSES.CONNECTED,
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

      fakeCloudWithoutNamespacesJson = mkCloudJson({
        __mockStatus: CONNECTION_STATUSES.CONNECTED,
        name: 'bar',
        cloudUrl: 'http://bar.com',
        namespaces: [],
      });

      disconnectedFakeCloudJson = mkCloudJson({
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
            synced: false,
          },
        ],
      });
    });

    it('triggers reconnect cloud action by clicking on "Reconnect" button', async () => {
      globalCloudStore.fromStore({
        clouds: {
          'http://foo.com': disconnectedFakeCloudJson,
        },
      });

      render(
        <CloudProvider>
          <SyncView />
        </CloudProvider>
      );

      await act(async () => await user.click(screen.getByText('Reconnect')));
      await sleep(10);

      expect(screen.getByText('http://foo.com')).toBeInTheDocument();
    });

    it('cloud |without| namespaces: triggers remove cloud action by clicking on "Remove" button', async () => {
      globalCloudStore.fromStore({
        clouds: {
          'http://bar.com': fakeCloudWithoutNamespacesJson,
        },
      });

      render(
        <CloudProvider>
          <SyncView />
        </CloudProvider>
      );

      await act(async () => await user.click(screen.getByText('Remove')));
      await sleep(10);

      expect(screen.queryByText('http://bar.com')).not.toBeInTheDocument();
    });

    it('cloud |with| namespaces: triggers remove cloud action by clicking on "Remove" button', async () => {
      globalCloudStore.fromStore({
        clouds: {
          'http://bar.com': fakeCloudJson,
        },
      });

      render(
        <CloudProvider>
          <ConfirmDialog />
          <SyncView />
        </CloudProvider>
      );

      await act(async () => await user.click(screen.getByText('Remove')));
      await sleep(10);

      await act(
        async () =>
          await user.click(document.querySelector('.confirm-buttons .ok'))
      );
      expect(screen.queryByText('http://bar.com')).not.toBeInTheDocument();
    });

    it('triggers open in browser action by clicking on "Open in browser" button', async () => {
      const logSpy = jest.spyOn(console, 'log');

      globalCloudStore.fromStore({
        clouds: {
          'http://bar.com': fakeCloudJson,
        },
      });

      render(
        <CloudProvider>
          <SyncView />
        </CloudProvider>
      );

      await act(
        async () => await user.click(screen.getByText('Open in browser'))
      );

      const searchInMultiDim = (arr, str) => {
        return (
          arr.find((t) => {
            return t.find((i) => i === str);
          }) && true
        );
      };

      expect(
        searchInMultiDim(logSpy.mock.calls, 'External url: http://bar.com')
      ).toBe(true);
    });
  });
});
