import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import * as strings from '../../../../strings';
import { layout } from '../../styles';

const {
  Component: { DrawerTitle, DrawerItem },
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

export const KubernetesInformation = ({ distribution, kubeletVersion }) => {
  //
  // RENDER
  //

  return (
    <>
      <DrawerTitleWrapper>
        <DrawerTitle>
          {strings.clusterPage.pages.details.kubernetesInformation.title()}
        </DrawerTitle>
      </DrawerTitleWrapper>
      <DrawerItemsWrapper>
        <DrawerItem
          name={strings.clusterPage.pages.details.kubernetesInformation.distribution()}
        >
          {distribution || unknownValue()}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.kubernetesInformation.kubeletVersion()}
        >
          {kubeletVersion || unknownValue()}
        </DrawerItem>
      </DrawerItemsWrapper>
    </>
  );
};

KubernetesInformation.propTypes = {
  distribution: propTypes.string.isRequired,
  kubeletVersion: propTypes.string.isRequired,
};
