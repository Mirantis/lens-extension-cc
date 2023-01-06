//
// Details panel for the ClusterPage within the 'Lens > Catalog > Cluster' UI
//

import propTypes from 'prop-types';
import { PageContainer, PanelsWrapper } from '../clusterPageComponents';
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
      <PanelsWrapper>
        <div>
          <GeneralInformation clusterEntity={clusterEntity} />
        </div>
        <div>
          <KubernetesInformation clusterEntity={clusterEntity} />
        </div>
        <div>
          <ServerInformation clusterEntity={clusterEntity} />
        </div>
        <div>
          <LmaInformation clusterEntity={clusterEntity} />
        </div>
      </PanelsWrapper>
    </PageContainer>
  );
};

ClusterDetailsView.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
