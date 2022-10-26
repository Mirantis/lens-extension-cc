//
// Main view for the ClusterPage within the 'Lens > Catalog > Cluster' UI
//

import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import * as rtv from 'rtvjs';
import * as strings from '../../../../strings';
import * as consts from '../../../../constants';
import { layout, mixinPageStyles } from '../../styles';
import { logger } from '../../../../util/logger';
import { clusterEntityModelTs } from '../../../../catalog/catalogEntities';
import { SummaryPanelContent } from './SummaryPanelContent';

//
// INTERNAL STYLED COMPONENTS
//

const PageContainer = styled.div(() => ({
  ...mixinPageStyles(),
  display: 'flex',
  flexDirection: 'column',
}));

const PagePanel = styled.div(() => ({
  width: '100%',
  backgroundColor: 'var(--contentColor)',
  marginBottom: layout.grid * 5,
}));

const PagePanelHead = styled.div(() => ({
  backgroundColor: 'var(--drawerSubtitleBackground)',
  paddingTop: layout.grid * 3.5,
  paddingBottom: layout.grid * 3.5,
  paddingLeft: layout.grid * 6,
  paddingRight: layout.grid * 6,
}));

const PagePanelBody = styled.div(() => ({
  paddingBottom: layout.grid * 6,
  paddingLeft: layout.grid * 6,
  paddingRight: layout.grid * 6,
}));

//
// MAIN COMPONENT
//

export const ClusterOverviewPage = function () {
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
      'ClusterOverviewPage.render()',
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
      <PagePanel>
        <PagePanelHead>
          <h2>{strings.clusterPage.pages.overview.summary.title()}</h2>
        </PagePanelHead>
        <PagePanelBody>
          <SummaryPanelContent clusterEntity={clusterEntity} />
        </PagePanelBody>
      </PagePanel>
    </PageContainer>
  );
};
