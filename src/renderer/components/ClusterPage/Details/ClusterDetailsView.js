//
// Details panel for the ClusterPage within the 'Lens > Catalog > Cluster' UI
//

import propTypes from 'prop-types';
import { PageContainer } from '../clusterPageComponents';
import { GeneralInformation } from './GeneralInformation';
import { KubernetesInformation } from './KubernetesInformation';
import { ServerInformation } from './ServerInformation';
import { LmaInformation } from './LmaInformation';

//
// MAIN COMPONENT
//

export const ClusterDetailsView = function ({ clusterEntity }) {
  //
  // RENDER
  //

  return (
    <PageContainer>
      <GeneralInformation clusterEntity={clusterEntity} />

      <KubernetesInformation clusterEntity={clusterEntity} />

      <ServerInformation clusterEntity={clusterEntity} />

      <LmaInformation clusterEntity={clusterEntity} />
    </PageContainer>
  );
};

ClusterDetailsView.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
