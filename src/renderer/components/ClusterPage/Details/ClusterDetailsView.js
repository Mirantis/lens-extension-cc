//
// Details panel for the ClusterPage within the 'Lens > Catalog > Cluster' UI
//

import propTypes from 'prop-types';
import {
  PageContainer,
  PanelsWrapper,
  PanelItem,
} from '../clusterPageComponents';
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
        <PanelItem>
          <GeneralInformation clusterEntity={clusterEntity} />
        </PanelItem>
        <PanelItem>
          <KubernetesInformation clusterEntity={clusterEntity} />
        </PanelItem>
        <PanelItem>
          <ServerInformation clusterEntity={clusterEntity} />
        </PanelItem>
        <PanelItem>
          <LmaInformation clusterEntity={clusterEntity} />
        </PanelItem>
      </PanelsWrapper>
    </PageContainer>
  );
};

ClusterDetailsView.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
