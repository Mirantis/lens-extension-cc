//
// Main view for the ClusterPage within the 'Lens > Catalog > Cluster' UI
//

import propTypes from 'prop-types';
import * as strings from '../../../../strings';
import { ConditionsPanel } from './ConditionsPanel';
import { SummaryPanel } from './SummaryPanel';
import { PanelTitle } from '../PanelTitle';
import { DrawerTitleWrapper, PageContainer } from '../clusterPageComponents';

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
