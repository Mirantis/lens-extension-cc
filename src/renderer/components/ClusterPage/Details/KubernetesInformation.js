import propTypes from 'prop-types';
import { Renderer } from '@k8slens/extensions';
import * as strings from '../../../../strings';
import { PanelTitle } from '../PanelTitle';
import {
  DrawerTitleWrapper,
  DrawerItemsWrapper,
} from '../clusterPageComponents';

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
