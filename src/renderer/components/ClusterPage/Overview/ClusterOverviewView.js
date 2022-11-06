//
// Main view for the ClusterPage within the 'Lens > Catalog > Cluster' UI
//

import propTypes from 'prop-types';
import styled from '@emotion/styled';
import * as strings from '../../../../strings';
import { layout, mixinPageStyles } from '../../styles';
import { ConditionsPanel } from './ConditionsPanel';
import { SummaryPanel } from './SummaryPanel';
import { PanelTitle } from '../PanelTitle';

//
// INTERNAL STYLED COMPONENTS
//

const PageContainer = styled.div(() => ({
  ...mixinPageStyles(),
  display: 'flex',
  flexDirection: 'column',
}));

const DrawerTitleWrapper = styled.div(() => ({
  paddingLeft: layout.pad * 3,
  paddingRight: layout.pad * 3,
  marginTop: -layout.pad * 3,
  marginBottom: -layout.pad * 3,
}));

//
// MAIN COMPONENT
//

export const ClusterOverviewView = function ({ clusterEntity }) {
  //
  // RENDER
  //

  return (
    <PageContainer>
      <SummaryPanel clusterEntity={clusterEntity} />

      <DrawerTitleWrapper>
        <PanelTitle
          title={strings.clusterPage.pages.overview.clusterConditions.title()}
        />
      </DrawerTitleWrapper>

      <ConditionsPanel clusterEntity={clusterEntity} />
    </PageContainer>
  );
};

ClusterOverviewView.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
