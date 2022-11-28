//
// Events panel for the ClusterPage within the 'Lens > Catalog > Cluster' UI
//

import propTypes from 'prop-types';
import { EventsPanel } from './EventsPanel';
import { PageContainer } from '../clusterPageComponents';

//
// MAIN COMPONENT
//

export const ClusterEventsView = function ({ clusterEntity }) {
  //
  // RENDER
  //

  return (
    <PageContainer>
      <EventsPanel clusterEntity={clusterEntity} />
    </PageContainer>
  );
};

ClusterEventsView.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
