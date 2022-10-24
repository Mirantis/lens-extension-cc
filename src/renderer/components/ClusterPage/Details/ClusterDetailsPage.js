//
// Details panel for the ClusterPage within the 'Lens > Catalog > Cluster' UI
//

import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import * as rtv from 'rtvjs';
import * as consts from '../../../../constants';
import { mixinPageStyles } from '../../styles';
import { logger } from '../../../../util/logger';
import { clusterEntityModelTs } from '../../../../catalog/catalogEntities';
import { GeneralInformation } from './GeneralInformation';
import { KubernetesInformation } from './KubernetesInformation';
import { MccInformation } from './MccInformation';
import { MirantisStacklightInformation } from './MirantisStacklightInformation';

//
// INTERNAL STYLED COMPONENTS
//

const PageContainer = styled.div(() => ({
  ...mixinPageStyles(),
  display: 'flex',
  flexDirection: 'column',
}));

//
// MAIN COMPONENT
//

export const ClusterDetailsPage = function () {
  const { activeEntity: clusterEntity } = Renderer.Catalog.catalogEntities;
  if (
    !clusterEntity ||
    clusterEntity.metadata.source !== consts.catalog.source
  ) {
    // this shouldn't happen, because this cluster page shouldn't be accessible
    //  as a menu item unless the Catalog has an active entity, and it's an MCC
    //  cluster (thanks to code in renderer.tsx) HOWEVER, Lens 5.2 has a lot of bugs
    //  around entity activation, so this is covering us just in case
    logger.error(
      'ClusterDetailsPage.render()',
      `Unable to render: Active Catalog entity ${
        clusterEntity
          ? `is not from source "${consts.catalog.source}"`
          : 'unknown'
      }`
    );
    return null;
  }

  DEV_ENV && rtv.verify(clusterEntity, clusterEntityModelTs);

  //
  // RENDER
  //

  return (
    <PageContainer>
      <GeneralInformation clusterEntity={clusterEntity} />

      <KubernetesInformation
        distribution={clusterEntity.metadata.distro}
        kubeletVersion={clusterEntity.metadata.kubeVersion}
      />

      <MccInformation clusterEntity={clusterEntity} />

      <MirantisStacklightInformation lma={clusterEntity.spec.lma} />
    </PageContainer>
  );
};
