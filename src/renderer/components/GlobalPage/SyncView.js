import { useState, useCallback } from 'react';
import { Renderer } from '@k8slens/extensions';
import styled from '@emotion/styled';
import { layout } from '../styles';
import { AddCloudInstance } from './AddCloudInstance.js';
import { useClouds } from '../../store/CloudProvider';
import { WelcomeView } from './WelcomeView';
import { syncView } from '../../../strings';
import { EnhancedTable } from '../EnhancedTable/EnhancedTable';
import { CreateClusterWizard } from '../CreateClusterWizard/CreateClusterWizard';
import { CONNECTION_STATUSES } from '../../../common/Cloud';
import { openBrowser } from '../../../util/netUtil';
import { IpcRenderer } from '../../IpcRenderer';
import * as consts from '../../../constants';
import * as strings from '../../../strings';

const {
  Component: { Button, Spinner, ConfirmDialog },
} = Renderer;

const Content = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  margin: ${layout.grid * 5}px;
  padding: ${layout.grid * 4}px ${layout.grid * 5}px;
  border-radius: 5px;
  background-color: var(--layoutBackground);
`;

const ContentTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h2`
  margin-bottom: ${layout.grid * 5}px;
`;

const TopButtonsWrapper = styled.div`
  text-align: right;
`;

const CancelButton = styled(Button)`
  margin-right: ${layout.grid}px;
`;

const TableWrapper = styled.div`
  max-height: calc(100vh - ${layout.grid * 57.5}px);
  margin-bottom: ${layout.grid * 5}px;
  border: 1px solid var(--inputControlBorder);
  border-radius: 5px;
  overflow: auto;
`;

const ButtonWrapper = styled.div`
  margin-top: auto;
  text-align: right;
`;

// NOTE: Lens Button component has `accent`, `light`, `plain`, and `outlined` styles,
//  but none of them give us a button that is actually _outlined_ with a border,
//  no fill, and label color that matches the border, so this is it
// NOTE: Lens Button component must use `primary=true` as the basis for our secondary styles
const SecondaryButton = styled(Button)(() => ({
  background: 'transparent !important', // important: to beat the component's priority of .Button.primary
  border: '1px solid var(--buttonPrimaryBackground)',
  color: 'var(--buttonPrimaryBackground)',
}));

const mkGetCloudMenuItems = (cloudActions) => (cloud) =>
  [
    {
      title: strings.contextMenus.cloud.reconnect(),
      id: `${cloud.name}-reconnect`,
      disabled: cloud.status === CONNECTION_STATUSES.CONNECTED,
      onClick: () => {
        // NOTE: this returns a promise, but we don't care about the result
        IpcRenderer.getInstance().invoke(
          consts.ipcEvents.invoke.RECONNECT,
          cloud.cloudUrl
        );
      },
    },
    {
      title: strings.contextMenus.cloud.sync(),
      id: `${cloud.name}-sync`,
      disabled:
        cloud.status === CONNECTION_STATUSES.DISCONNECTED || cloud.fetching,
      onClick: () => {
        // NOTE: this returns a promise, but we don't care about the result
        IpcRenderer.getInstance().invoke(
          consts.ipcEvents.invoke.SYNC_NOW,
          cloud.cloudUrl
        );
      },
    },
    {
      title: strings.contextMenus.cloud.openInBrowser(),
      id: `${cloud.name}-openInBrowser`,
      disabled: false,
      onClick: () => {
        openBrowser(cloud.cloudUrl);
      },
    },
    {
      title: strings.contextMenus.cloud.remove(),
      id: `${cloud.name}-remove`,
      disabled: cloud.fetching,
      onClick: () => {
        const { name: cloudName, cloudUrl, syncedProjects, connected } = cloud;
        const isConnected = connected && cloud.loaded;
        if (isConnected && !cloud.namespaces.length) {
          cloudActions.removeCloud(cloudUrl);
        } else {
          ConfirmDialog.open({
            ok: () => {
              cloudActions.removeCloud(cloudUrl);
            },
            labelOk:
              strings.contextMenus.cloud.confirmDialog.confirmButtonLabel(),
            message: (
              <div
                dangerouslySetInnerHTML={{
                  __html: strings.contextMenus.cloud.confirmDialog.messageHtml(
                    cloudName,
                    syncedProjects
                  ),
                }}
              />
            ),
          });
        }
      },
    },
  ];

const mkGetNamespaceMenuItems =
  ({ onCreateClusterClick }) =>
  (cloud, namespace) => {
    const items = [
      {
        title: strings.contextMenus.namespace.openInBrowser(),
        id: `${cloud.name}-openInBrowser`,
        onClick: () => {
          openBrowser(`${cloud.cloudUrl}/projects/${namespace.name}`);
        },
      },
    ];

    // TODO: for now, Create Cluster is only in local dev mode and always enable item
    //  if in local dev mode
    if (DEV_ENV) {
      items.push({
        title: strings.contextMenus.namespace.createCluster(),
        id: `${cloud.name}-createCluster`,
        disabled:
          !DEV_ENV &&
          (cloud.status === CONNECTION_STATUSES.DISCONNECTED || cloud.fetching),
        onClick: onCreateClusterClick,
      });
    }

    return items;
  };

export const SyncView = () => {
  const { clouds, actions: cloudActions } = useClouds();
  const [showAddCloudComponent, setShowAddCloudComponent] = useState(false);
  const [showCreateClusterWizard, setShowCreateClusterWizard] = useState(false);
  const [isSelectiveSyncView, setIsSelectiveSyncView] = useState(false);
  const [isSyncStarted, setIsSyncStarted] = useState(false);
  const [syncedClouds, setSyncedClouds] = useState({});

  const handleAddCloud = useCallback(
    function (cloud) {
      cloudActions.addCloud(cloud);
      setShowAddCloudComponent(false);
    },
    [cloudActions]
  );

  const handleAddCloudCancel = useCallback(
    () => setShowAddCloudComponent(false),
    []
  );
  const handleOpenAddCloud = useCallback(
    () => setShowAddCloudComponent(true),
    []
  );

  const handleCreateClusterClick = useCallback(
    () => setShowCreateClusterWizard(true),
    []
  );
  const handleCreateClusterCancel = useCallback(
    () => setShowCreateClusterWizard(false),
    []
  );
  const handleCreateClusterComplete = useCallback((data) => {
    setShowCreateClusterWizard(false);
    // TODO: make API call using `data`...
  }, []);

  const closeSelectiveSyncView = () => {
    setIsSelectiveSyncView(false);
    setIsSyncStarted(false);
    setSyncedClouds({});
  };
  const openSelectiveSyncView = () => setIsSelectiveSyncView(true);

  /**
   * @param {Object} data
   * @param {boolean} data.syncAll
   * @param {Array<string>} data.syncedNamespaces
   * @param {Array<string>} data.ignoredNamespaces
   * @param {string} url - cloudUrl
   */
  const getDataToSync = (data, url) => {
    // store data from each cloud in the local object 'syncedClouds'
    const newSyncedClouds = { ...syncedClouds, [url]: data };
    setSyncedClouds(newSyncedClouds);

    // when clouds count in local object === count DCs, preparation is done
    if (
      isSyncStarted &&
      Object.keys(newSyncedClouds).length === Object.keys(clouds).length
    ) {
      setIsSyncStarted(false);

      // go through all clouds and update properties
      Object.keys(newSyncedClouds).map((cloudUrl) => {
        const { syncAll, syncedNamespaces, ignoredNamespaces } =
          newSyncedClouds[cloudUrl];
        const cloud = clouds[cloudUrl];
        cloud.syncAll = syncAll;
        cloud.updateSyncedProjects(syncedNamespaces, ignoredNamespaces);
      });

      closeSelectiveSyncView();
    }
  };

  const startSyncAll = () => {
    // clean syncedClouds and start get data to Sync
    setSyncedClouds({});
    setIsSyncStarted(true);
  };

  // we control this state and should check it first
  if (showAddCloudComponent) {
    return (
      <AddCloudInstance
        onAdd={handleAddCloud}
        onCancel={handleAddCloudCancel}
      />
    );
  }

  if (showCreateClusterWizard) {
    return (
      <CreateClusterWizard
        onCancel={handleCreateClusterCancel}
        onComplete={handleCreateClusterComplete}
      />
    );
  }

  // in no clouds => show Welcome page
  if (!Object.keys(clouds).length) {
    return <WelcomeView openAddCloud={handleOpenAddCloud} />;
  }

  // otherwise, show dataClouds table
  if (Object.keys(clouds).length) {
    return (
      <Content>
        <ContentTop>
          <Title>{syncView.title()}</Title>
          <TopButtonsWrapper>
            {isSelectiveSyncView ? (
              <>
                <CancelButton
                  plain
                  label={syncView.cancelButtonLabel()}
                  onClick={closeSelectiveSyncView}
                />
                <Button
                  primary
                  label={syncView.synchronizeProjectsButtonLabel()}
                  onClick={startSyncAll}
                />
              </>
            ) : (
              <SecondaryButton
                // NOTE: secondary appearance is based on primary: Lens doesn't have a secondary style
                primary
                label={syncView.syncButtonLabel()}
                onClick={openSelectiveSyncView}
              />
            )}
          </TopButtonsWrapper>
        </ContentTop>

        <TableWrapper>
          <EnhancedTable
            clouds={clouds}
            isSelectiveSyncView={isSelectiveSyncView}
            isSyncStarted={isSyncStarted}
            getDataToSync={getDataToSync}
            getCloudMenuItems={mkGetCloudMenuItems(cloudActions)}
            getNamespaceMenuItems={mkGetNamespaceMenuItems({
              onCreateClusterClick: handleCreateClusterClick,
            })}
          />
        </TableWrapper>

        <ButtonWrapper>
          <Button
            primary
            label={syncView.connectButtonLabel()}
            onClick={handleOpenAddCloud}
            disabled={isSelectiveSyncView}
          />
        </ButtonWrapper>
      </Content>
    );
  }

  // Just in case. Show loader only while initial loading.
  // Eg when we have clouds on disk, but they are not transformed to dataClouds yet
  return <Spinner />;
};
