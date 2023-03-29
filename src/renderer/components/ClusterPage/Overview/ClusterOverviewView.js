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
// TODO[metrics]: Enable this code
// import { cloudVersionIsGTE } from '../../../../catalog/catalogEntities';
// import { clusterHealthCloudVersion } from '../../../../constants';

//
// MAIN COMPONENT
//

export const ClusterOverviewView = function ({ clusterEntity }) {
  //
  // RENDER
  //

  const showHealth = false; // TODO[metrics]: Use this instead: `cloudVersionIsGTE(clusterEntity, clusterHealthCloudVersion);`

  return (
    <PageContainer>
      <PanelsWrapper>
        <PanelItem isHalfWidth={showHealth}>
          <SummaryPanel clusterEntity={clusterEntity} />
        </PanelItem>
        {showHealth ? (
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
