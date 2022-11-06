import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import * as strings from '../../../../strings';
import { layout } from '../../styles';
import { PanelTitle } from '../PanelTitle';

const {
  Component: { DrawerItem },
} = Renderer;

const {
  catalog: {
    entities: {
      common: {
        details: { unknownValue },
      },
    },
  },
} = strings;

//
// INTERNAL STYLED COMPONENTS
//

const DrawerTitleWrapper = styled.div(() => ({
  paddingLeft: layout.pad * 3,
  paddingRight: layout.pad * 3,
  marginTop: -layout.pad * 3,
  marginBottom: -layout.pad * 3,
}));

const DrawerItemsWrapper = styled.div(() => ({
  paddingLeft: layout.pad * 3,
  paddingRight: layout.pad * 3,
  paddingBottom: layout.pad * 2.25,
  backgroundColor: 'var(--contentColor)',

  '& > div': {
    paddingTop: layout.pad * 1.5,
    paddingBottom: layout.pad * 1.5,
  },
}));

//
// MAIN COMPONENT
//

export const KubernetesInformation = ({ clusterEntity }) => {
  //
  // RENDER
  //

  return (
    <>
      <DrawerTitleWrapper>
        <PanelTitle
          title={strings.clusterPage.pages.details.kubernetesInformation.title()}
        />
      </DrawerTitleWrapper>
      <DrawerItemsWrapper>
        <DrawerItem
          name={strings.clusterPage.pages.details.kubernetesInformation.distribution()}
        >
          {clusterEntity.metadata.distro || unknownValue()}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.kubernetesInformation.kubeletVersion()}
        >
          {clusterEntity.metadata.kubeVersion || unknownValue()}
        </DrawerItem>
      </DrawerItemsWrapper>
    </>
  );
};

KubernetesInformation.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
