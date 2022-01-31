import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';
import { EnhancedTable } from '../EnhancedTable/EnhancedTable.js';
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

export const ManagementCloudsTable = ({ extClouds }) => {
  return (
    <Content>
      <ContentTop>
        <Title>{managementClusters.title()}</Title>
        <Component.Button
          variant="outlined"
          label={managementClusters.syncButtonLabel()}
        />
      </ContentTop>

      <TableWrapper>
        <EnhancedTable extClouds={extClouds} withCheckboxes={true} />
      </TableWrapper>

      <ButtonWrapper>
        <Component.Button
          primary
          label={managementClusters.connectButtonLabel()}
        />
      </ButtonWrapper>
    </Content>
  );
};

ManagementCloudsTable.propTypes = {
  extClouds: PropTypes.object,
};

ManagementCloudsTable.defaultProps = {
  extClouds: mockedExtendedClouds,
};
