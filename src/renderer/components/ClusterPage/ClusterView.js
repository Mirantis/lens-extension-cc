//
// Main view for the ClusterPage
//

import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import * as rtv from 'rtvjs';
import * as strings from '../../../strings';
import * as consts from '../../../constants';
import { layout, mixinPageStyles } from '../styles';
import { logger } from '../../../util/logger';
import { clusterEntityTs } from '../../../typesets';

const { Component } = Renderer;

//
// INTERNAL STYLED COMPONENTS
//

const ClusterInfo = styled.ul(() => ({
  marginTop: 0,
  listStyle: 'none',

  '> li': {
    display: 'flex',
    alignItems: 'center',
    marginTop: layout.pad,

    '&:first-child': {
      marginTop: 0,
    },

    '> a': {
      display: 'flex',
      alignItems: 'center',

      // icon
      i: {
        marginRight: layout.grid,
      },
    },
  },
}));

const PagePanel = styled.div(() => ({
  marginTop: layout.gap,
  marginBottom: layout.gap,
  padding: layout.gap,
  backgroundColor: 'var(--contentColor)',
  width: '100%',

  '&:first-child': {
    marginTop: 0,
  },

  '&:last-child': {
    marginBottom: 0,
  },

  '> h3': {
    marginBottom: layout.gap,
  },
}));

const PageContainer = styled.div(() => ({
  ...mixinPageStyles(),
  display: 'flex',
  flexDirection: 'column',
}));

//
// MAIN COMPONENT
//

export const ClusterView = function () {
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
      'ClusterView.render()',
      `Unable to render: Active Catalog entity ${
        clusterEntity
          ? `is not from source "${consts.catalog.source}"`
          : 'unknown'
      }`
    );
    return null;
  }

  DEV_ENV && rtv.verify(clusterEntity, clusterEntityTs);

  //
  // STATE
  //

  //
  // EVENTS
  //

  //
  // EFFECTS
  //

  //
  // RENDER
  //

  const browserUrl = `${clusterEntity.metadata.cloudUrl}/projects/${clusterEntity.metadata.namespace}/clusters/${clusterEntity.metadata.name}`;

  return (
    <PageContainer>
      <h2>{strings.clusterPage.title()}</h2>
      <PagePanel>
        <ClusterInfo>
          <li>
            <a href={browserUrl} target="_blank" rel="noreferrer">
              <Component.Icon material="open_in_new" />
              <span>{strings.clusterView.infoPanel.viewInBrowser()}</span>
            </a>
          </li>
        </ClusterInfo>
      </PagePanel>
    </PageContainer>
  );
};
