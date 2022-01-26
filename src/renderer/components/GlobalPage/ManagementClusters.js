import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';
import { EnhancedTable } from '../EnhancedTable/EnhancedTable.js';
import { managementClusters } from '../../../strings';
import { mockedExtendedClouds } from '../../../../test/mocks/mockExtCloud.js';

const { Component } = Renderer;

const Content = styled.div(() => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  margin: layout.grid * 5,
  paddingTop: layout.grid * 4,
  paddingBottom: layout.grid * 4,
  paddingLeft: layout.grid * 5,
  paddingRight: layout.grid * 5,
  borderRadius: 5,
  backgroundColor: 'var(--layoutBackground)',
}));

const ContentTop = styled.div(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

const Title = styled.h2(() => ({
  marginBottom: layout.grid * 5,
}));

const TableWrapper = styled.div(() => ({
  marginBottom: layout.grid * 5,
}));

const ButtonWrapper = styled.div(() => ({
  marginTop: 'auto',
  textAlign: 'right',
}));

export const ManagementClusters = () => {
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
        <EnhancedTable extClouds={mockedExtendedClouds} />
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
