import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';
import { SelectiveSyncTable } from '../SelectiveSyncTable/SelectiveSyncTable.js';
import { managementClusters } from '../../../strings';
import { mockedExtendedClouds } from '../../../../test/mocks/mockExtCloud.js';

const { Component } = Renderer;

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
  margin-bottom: ${layout.grid * 5}px;
`;

const TableWrapper = styled.div`
  max-height: calc(100vh - ${layout.grid * 50}px);
  margin-bottom: ${layout.grid * 5}px;
  border: 1px solid var(--inputControlBorder);
  border-radius: 5px;
  overflow: auto;
`;

const ButtonsWrapper = styled.div`
  text-align: right;
`;

export const ManagementCloudsTable = ({ extClouds }) => {
  return (
    <Content>
      <ContentTop>
        <h2>{managementClusters.title()}</h2>
        <ButtonsWrapper>
          <Component.Button
            plain
            label={managementClusters.cancelButtonLabel()}
          />
          <Component.Button
            primary
            label={managementClusters.synchroniseProjectsButtonLabel()}
          />
        </ButtonsWrapper>
      </ContentTop>

      <TableWrapper>
        <SelectiveSyncTable extClouds={extClouds} withCheckboxes={true} />
      </TableWrapper>
    </Content>
  );
};

ManagementCloudsTable.propTypes = {
  extClouds: PropTypes.object,
};

ManagementCloudsTable.defaultProps = {
  extClouds: mockedExtendedClouds,
};
