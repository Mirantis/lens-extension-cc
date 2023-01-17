//
// Main view for the ClusterPage within the 'Lens > Catalog > Cluster' UI
//

import propTypes from 'prop-types';
import { ConditionsPanel } from './ConditionsPanel';
import { SummaryPanel } from './SummaryPanel';
import { HealthPanel } from './HealthPanel';
import {
  PageContainer,
  PanelsWrapper,
  PanelItem,
} from '../clusterPageComponents';

//
// MAIN COMPONENT
//

export const ClusterOverviewView = function ({ clusterEntity }) {
  //
  // RENDER
  //

  return (
    <PageContainer>
      <PanelsWrapper>
        <PanelItem isHalfWidth={FEAT_CLUSTER_PAGE_HEALTH_ENABLED || false}>
          <SummaryPanel clusterEntity={clusterEntity} />
        </PanelItem>
        {FEAT_CLUSTER_PAGE_HEALTH_ENABLED ? (
          <PanelItem isHalfWidth>
            <HealthPanel clusterEntity={clusterEntity} />
          </PanelItem>
        ) : null}
        <PanelItem>
          <ConditionsPanel clusterEntity={clusterEntity} />
        </PanelItem>
      </PanelsWrapper>
    </PageContainer>
  );
};

ClusterOverviewView.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
