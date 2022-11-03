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
import { ConditionsPanel } from './ConditionsPanel';
import { SummaryPanel } from './SummaryPanel';
import { themeModes } from '../../theme';

const {
  Component: { DrawerTitle },
} = Renderer;

//
// INTERNAL STYLED COMPONENTS
//

const PageContainer = styled.div(() => ({
  ...mixinPageStyles(),
  display: 'flex',
  flexDirection: 'column',
}));

const DrawerTitleWrapper = styled.div(() => ({
  paddingLeft: layout.pad * 3,
  paddingRight: layout.pad * 3,
  marginTop: -layout.pad * 3,
  marginBottom: -layout.pad * 3,
}));

const PanelTitle = styled(DrawerTitle)(({ theme }) => ({
  backgroundColor:
    theme.mode === themeModes.LIGHT
      ? 'var(--layoutTabsLineColor)'
      : 'var(--drawerSubtitleBackground)',
}));

//
// MAIN COMPONENT
//

export const ClusterOverviewView = function () {
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
      'ClusterOverviewView.render()',
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
      <SummaryPanel clusterEntity={clusterEntity} />

      <DrawerTitleWrapper>
        <PanelTitle>
          {strings.clusterPage.pages.overview.clusterConditions.title()}
        </PanelTitle>
      </DrawerTitleWrapper>

      <ConditionsPanel conditions={clusterEntity.spec.conditions || []} />
    </PageContainer>
  );
};
