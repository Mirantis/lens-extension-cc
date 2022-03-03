import { useState, useCallback, useEffect } from 'react';
import { Renderer } from '@k8slens/extensions';
import styled from '@emotion/styled';
import { layout } from '../styles';
import { AddCloudInstance } from './AddCloudInstance.js';
import { useDataCloudData } from '../../store/DataCloudProvider';
import { WelcomeView } from './WelcomeView';
import { cloudStore } from '../../../store/CloudStore';
import { syncView } from '../../../strings';
import { EnhancedTable } from '../EnhancedTable/EnhancedTable';

const {
  Component: { Button, Spinner },
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

export const SyncView = () => {
  const {
    state: { extendedClouds },
  } = useDataCloudData();
  const [showAddCloudComponent, setShowAddCloudComponent] = useState(false);
  const [isSelectiveSyncView, setIsSelectiveSyncView] = useState(false);
  const [isSyncStarted, setIsSyncStarted] = useState(false);
  const [syncedClouds, setSyncedClouds] = useState({});

  const handleAddCloud = useCallback(function (cloud) {
    cloudStore.addCloud(cloud);
    setShowAddCloudComponent(false);
  }, []);

  const onCancel = () => setShowAddCloudComponent(false);
  const openAddCloud = () => setShowAddCloudComponent(true);
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
    setSyncedClouds({ ...syncedClouds, [url]: data });
    // when clouds count in local object === count ECs, preparation is done and we can use syncedClouds
    if (
      Object.keys(syncedClouds).length === Object.keys(extendedClouds).length
    ) {
      setIsSyncStarted(false);
    }
  };
  const startSyncAll = () => {
    // clean syncedClouds and start get data to Sync
    setSyncedClouds({});
    setIsSyncStarted(true);
  };

  useEffect(() => {
    // this condition happens only when last cloud is written to syncedClouds
    if (!isSyncStarted && Object.keys(syncedClouds).length) {
      // go through all clouds and update properties
      Object.keys(syncedClouds).map((url) => {
        const { syncAll, syncedNamespaces, ignoredNamespaces } =
          syncedClouds[url];
        const cloud = cloudStore.clouds[url];
        cloud.syncAll = syncAll;
        cloud.updateNamespaces(syncedNamespaces, ignoredNamespaces);
      });
      closeSelectiveSyncView();
    }
  }, [syncedClouds, isSyncStarted]);

  // we control this state and should check it first
  if (showAddCloudComponent) {
    return <AddCloudInstance onAdd={handleAddCloud} onCancel={onCancel} />;
  }
  // in no clouds => show Welcome page
  if (!Object.keys(cloudStore.clouds).length) {
    return <WelcomeView openAddCloud={openAddCloud} />;
  }
  // otherwise, show extendedClouds table
  if (Object.keys(extendedClouds).length) {
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
              <Button
                variant="outlined"
                label={syncView.syncButtonLabel()}
                onClick={openSelectiveSyncView}
              />
            )}
          </TopButtonsWrapper>
        </ContentTop>

        <TableWrapper>
          <EnhancedTable
            extendedClouds={extendedClouds}
            isSelectiveSyncView={isSelectiveSyncView}
            isSyncStarted={isSyncStarted}
            getDataToSync={getDataToSync}
          />
        </TableWrapper>

        {!isSelectiveSyncView && (
          <ButtonWrapper>
            <Button
              primary
              label={syncView.connectButtonLabel()}
              onClick={openAddCloud}
            />
          </ButtonWrapper>
        )}
      </Content>
    );
  }

  // Just in case. Show loader only while initial loading.
  // Eg when we have clouds on disk, but they are not transformed to extendedClouds yet
  return <Spinner />;
};
