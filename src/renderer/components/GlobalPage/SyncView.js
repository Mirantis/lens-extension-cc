import { useState, useCallback } from 'react';
import { Renderer } from '@k8slens/extensions';
import styled from '@emotion/styled';
import { layout } from '../styles';
import { AddCloudInstance } from './AddCloudInstance.js';
import { useExtendedCloudData } from '../../store/ExtendedCloudProvider';
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
  } = useExtendedCloudData();
  const [showAddCloudComponent, setShowAddCloudComponent] = useState();
  const [isSelectiveSyncView, setIsSelectiveSyncView] = useState(false);

  const handleAddCloud = useCallback(function (cloud) {
    cloudStore.addCloud(cloud);
    setShowAddCloudComponent(false);
  }, []);

  const onCancel = () => setShowAddCloudComponent(false);
  const openAddCloud = () => setShowAddCloudComponent(true);

  // we control this state and should check it first
  if (showAddCloudComponent) {
    return <AddCloudInstance onAdd={handleAddCloud} onCancel={onCancel} />;
  }
  // in no clouds => show Welcome page
  if (!Object.keys(cloudStore.clouds).length) {
    return <WelcomeView openAddCloud={openAddCloud} />;
  }
  // otherwise show extendedClouds table
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
                  onClick={() => setIsSelectiveSyncView(!isSelectiveSyncView)}
                />
                <Button
                  primary
                  label={syncView.synchronizeProjectsButtonLabel()}
                />
              </>
            ) : (
              <Button
                variant="outlined"
                label={syncView.syncButtonLabel()}
                onClick={() => setIsSelectiveSyncView(!isSelectiveSyncView)}
              />
            )}
          </TopButtonsWrapper>
        </ContentTop>

        <TableWrapper>
          <EnhancedTable
            extendedClouds={extendedClouds}
            isSelectiveSyncView={isSelectiveSyncView}
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
