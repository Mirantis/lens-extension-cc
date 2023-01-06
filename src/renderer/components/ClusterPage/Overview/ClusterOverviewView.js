//
// Main view for the ClusterPage within the 'Lens > Catalog > Cluster' UI
//

import propTypes from 'prop-types';
import { ConditionsPanel } from './ConditionsPanel';
import { SummaryPanel } from './SummaryPanel';
import { HealthPanel } from './HealthPanel';

import { PageContainer, PanelsWrapper } from '../clusterPageComponents';

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
        <div>
          <SummaryPanel clusterEntity={clusterEntity} />
        </div>
        {FEAT_CLUSTER_PAGE_HEALTH_ENABLED ? (
          <div>
            <HealthPanel clusterEntity={clusterEntity} />
          </div>
        ) : null}
        <div>
          <ConditionsPanel clusterEntity={clusterEntity} />
        </div>
      </PanelsWrapper>
    </PageContainer>
  );
};

ClusterOverviewView.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
