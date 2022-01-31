import { useState } from 'react';
import { Renderer } from '@k8slens/extensions';
import styled from '@emotion/styled';
import { layout } from '../styles';
import { AddCloudInstance } from './AddCloudInstance.js';
import { useExtendedCloudData } from '../../store/ExtendedCloudProvider';
import { WelcomeView } from './WelcomeView';
import { cloudStore } from '../../../store/CloudStore';
import { managementClusters } from '../../../strings';
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
  const [showAddCloudComponent, setShowAddCloudComponent] = useState(false);
  const openAddCloudBlock = () => setShowAddCloudComponent(true);
  const closeAddCloudBlock = () => setShowAddCloudComponent(false);

  // we control this state and should check it first
  if (showAddCloudComponent) {
    return <AddCloudInstance closeAddCloudBlock={closeAddCloudBlock} />;
  }
  // in no clouds => show Welcome page
  if (!Object.keys(cloudStore.clouds).length) {
    return <WelcomeView openAddCloudBlock={openAddCloudBlock} />;
  }
  // otherwise show extendedClouds table
  if (Object.keys(extendedClouds).length) {
    return (
      <Content>
        <ContentTop>
          <Title>{managementClusters.title()}</Title>
          <Button
            variant="outlined"
            label={managementClusters.syncButtonLabel()}
          />
        </ContentTop>

        <TableWrapper>
          <EnhancedTable extendedClouds={extendedClouds} />
        </TableWrapper>

        <ButtonWrapper>
          <Button
            primary
            label={managementClusters.connectButtonLabel()}
            onClick={openAddCloudBlock}
          />
        </ButtonWrapper>
      </Content>
    );
  }

  // Just in case. Show loader only while initial loading.
  // Eg when we have clouds on disk, but they are not transformed to extendedClouds yet
  return <Spinner />;
};
