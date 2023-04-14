import mockConsole from 'jest-mock-console';
import { render, screen, act } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { CloudProvider } from '../../../store/CloudProvider';
import { IpcRenderer } from '../../../IpcRenderer';
import { globalCloudStore } from '../../../../store/CloudStore';
import * as strings from '../../../../strings';
import { SyncView } from '../SyncView';

describe('/renderer/components/GlobalSyncPage/SyncView', () => {
  const extension = {};
  let user;
  let ipcRenderer;

  beforeEach(() => {
    user = userEvent.setup();

    // NOTE: we mock 'error' also because we're using fake URLs given to Cloud instances
    //  which will attempt to load MCC configs from them and will fail, generating console
    //  errors which are inconsequential to our tests herein
    mockConsole(); // automatically restored after each test

    ipcRenderer = IpcRenderer.createInstance(extension);
    globalCloudStore.loadExtension(extension, { ipcRenderer });
  });

  describe('clouds do not exist', () => {
    beforeEach(() => {});

    it('renders WelcomeView component instead of dataClouds table', () => {
      render(
        <CloudProvider>
          <SyncView />
        </CloudProvider>
      );

      expect(
        screen.getByText(strings.welcome.description())
      ).toBeInTheDocument();
    });
  });

  describe('clouds exist', () => {
    beforeEach(() => {
      globalCloudStore.fromStore({
        clouds: {
          'https://foo.com': {
            cloudUrl: 'https://foo.com',
            name: 'foo',
            syncAll: false,
            username: null,
            id_token: null,
            expires_in: null,
            tokenExpiresAt: null,
            _tokenValidTill: null,
            refresh_token: null,
            refresh_expires_in: null,
            refreshExpiresAt: null,
            _refreshValidTill: null,
            namespaces: [
              {
                name: 'namespace 1',
                cloudUrl: 'https://foo.com',
                clusterCount: 4,
                machineCount: 12,
                sshKeyCount: 2,
                credentialCount: 4,
                proxyCount: 0,
                licenseCount: 1,
                synced: true,
              },
              {
                name: 'namespace 2',
                cloudUrl: 'https://foo.com',
                clusterCount: 1,
                machineCount: 6,
                sshKeyCount: 9,
                credentialCount: 8,
                proxyCount: 0,
                licenseCount: 0,
                synced: true,
              },
              {
                name: 'namespace 3',
                cloudUrl: 'https://foo.com',
                clusterCount: 0,
                machineCount: 0,
                sshKeyCount: 0,
                credentialCount: 1,
                proxyCount: 0,
                licenseCount: 0,
                synced: true,
              },
              {
                name: 'namespace 4',
                cloudUrl: 'https://foo.com',
                clusterCount: 2,
                machineCount: 10,
                sshKeyCount: 3,
                credentialCount: 6,
                proxyCount: 1,
                licenseCount: 1,
                synced: true,
              },
              {
                name: 'namespace 5',
                cloudUrl: 'https://foo.com',
                clusterCount: 2,
                machineCount: 10,
                sshKeyCount: 1,
                credentialCount: 1,
                proxyCount: 0,
                licenseCount: 0,
                synced: false,
              },
            ],
          },
        },
      });
    });

    it('renders SyncView component', () => {
      render(
        <CloudProvider>
          <SyncView />
        </CloudProvider>
      );

      expect(screen.getByText(strings.syncView.title())).toBeInTheDocument();
    });

    it('shows ConnectionBlock component by clicking on connect button and close it by clicking on cancel button', async () => {
      render(
        <CloudProvider>
          <SyncView />
        </CloudProvider>
      );

      const connectionBlockTitle = strings.connectionBlock.title();

      expect(screen.queryByText(connectionBlockTitle)).not.toBeInTheDocument();

      await act(
        async () =>
          await user.click(
            screen.getByText(strings.syncView.connectButtonLabel())
          )
      );
      expect(screen.getByText(connectionBlockTitle)).toBeInTheDocument();

      await act(
        async () =>
          await user.click(document.querySelector('i[material="close"]'))
      );
      expect(screen.queryByText(connectionBlockTitle)).not.toBeInTheDocument();
    });

    it('opens Selective Sync view by clicking on syncView button and close it by clicking on cancel button', async () => {
      render(
        <CloudProvider>
          <SyncView />
        </CloudProvider>
      );

      const synchronizeProjectsButtonLabel =
        strings.syncView.synchronizeProjectsButtonLabel();

      expect(
        screen.queryByText(synchronizeProjectsButtonLabel)
      ).not.toBeInTheDocument();

      await act(
        async () =>
          await user.click(screen.getByText(strings.syncView.syncButtonLabel()))
      );
      expect(
        screen.getByText(synchronizeProjectsButtonLabel)
      ).toBeInTheDocument();

      await act(
        async () =>
          await user.click(
            screen.getByText(strings.syncView.cancelButtonLabel())
          )
      );
      expect(
        screen.queryByText(synchronizeProjectsButtonLabel)
      ).not.toBeInTheDocument();
    });

    it('synchronizes selected projects', async () => {
      render(
        <CloudProvider>
          <SyncView />
        </CloudProvider>
      );

      // after render we shouldn't see unsynced namespace (namespace 5 in our case)
      await act(
        async () =>
          await user.click(
            document.querySelector('i[material="chevron_right"]')
          )
      );
      expect(screen.queryByText('namespace 5')).not.toBeInTheDocument();

      // but we should see it in Selective sync view
      // so let's check it and synchronize selected projects
      await act(
        async () =>
          await user.click(screen.getByText(strings.syncView.syncButtonLabel()))
      );
      await act(
        async () =>
          await user.click(
            document.querySelector('i[material="chevron_right"]')
          )
      );
      await act(async () => await user.click(screen.getByText('namespace 5')));
      await act(
        async () =>
          await user.click(
            screen.getByText(strings.syncView.synchronizeProjectsButtonLabel())
          )
      );

      // now, we should see it in the list of synced namespaces
      await act(
        async () =>
          await user.click(
            document.querySelector('i[material="chevron_right"]')
          )
      );
      expect(screen.getByText('namespace 5')).toBeInTheDocument();
    });
  });
});
