//
// History panel for the ClusterPage within the 'Lens > Catalog > Cluster' UI
//

import propTypes from 'prop-types';
import { HistoryPanel } from './HistoryPanel';
import { PageContainer } from '../clusterPageComponents';

//
// MAIN COMPONENT
//

export const ClusterHistoryView = function ({ clusterEntity }) {
  //
  // RENDER
  //

  return (
    <PageContainer>
      <HistoryPanel clusterEntity={clusterEntity} />
    </PageContainer>
  );
};

ClusterHistoryView.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
