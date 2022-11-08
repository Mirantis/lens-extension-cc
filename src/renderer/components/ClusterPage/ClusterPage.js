import React from 'react';
import styled from '@emotion/styled';
import propTypes from 'prop-types';
import { ThemeProvider } from '@emotion/react';
import { Renderer } from '@k8slens/extensions';
import * as rtv from 'rtvjs';
import * as consts from '../../../constants';
import { logger } from '../../../util/logger';
import { clusterEntityModelTs } from '../../../catalog/catalogEntities';
import { useThemeSwitching } from '../useThemeSwitching';
import { layout } from '../styles';

//
// STYLED COMPONENTS
//

export const DrawerTitleWrapper = styled.div(() => ({
  paddingLeft: layout.pad * 3,
  paddingRight: layout.pad * 3,
  marginTop: -layout.pad * 3,
  marginBottom: -layout.pad * 3,
}));

export const DrawerItemsWrapper = styled.div(() => ({
  paddingLeft: layout.pad * 3,
  paddingRight: layout.pad * 3,
  paddingBottom: layout.pad * 2.25,
  backgroundColor: 'var(--contentColor)',

  '& > div': {
    paddingTop: layout.pad * 1.5,
    paddingBottom: layout.pad * 1.5,
  },
}));

export const Link = styled.a(() => ({
  color: 'var(--primary)',
}));

//
// MAIN COMPONENT
//

export const ClusterPage = ({ children }) => {
  const { theme } = useThemeSwitching();
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
      'ClusterPage.render()',
      `Unable to render: Active Catalog entity ${
        clusterEntity
          ? `is not from source "${consts.catalog.source}"`
          : 'unknown'
      }`
    );
    return null;
  }

  DEV_ENV && rtv.verify(clusterEntity, clusterEntityModelTs);

  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { clusterEntity });
    }
    return child;
  });

  return <ThemeProvider theme={theme}>{childrenWithProps}</ThemeProvider>;
};

ClusterPage.propTypes = {
  children: propTypes.node.isRequired,
};
