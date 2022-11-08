import propTypes from 'prop-types';
import { Renderer } from '@k8slens/extensions';
import * as strings from '../../../../strings';
import { PanelTitle } from '../PanelTitle';
import { DrawerTitleWrapper, DrawerItemsWrapper, Link } from '../ClusterPage';

const {
  Component: { DrawerItem },
} = Renderer;

//
// MAIN COMPONENT
//

export const LmaInformation = ({ clusterEntity }) => {
  //
  // RENDER
  //

  return (
    <>
      <DrawerTitleWrapper>
        <PanelTitle
          title={strings.clusterPage.pages.details.lmaInformation.title()}
        />
      </DrawerTitleWrapper>
      <DrawerItemsWrapper>
        <DrawerItem
          name={strings.clusterPage.pages.details.lmaInformation.lmaEnabled()}
        >
          {strings.clusterPage.pages.details.lmaInformation.isLmaEnabled(
            !!clusterEntity.spec.lma
          )}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.lmaInformation.alerta()}
        >
          {clusterEntity.spec.lma.alertaUrl ? (
            <Link
              href={clusterEntity.spec.lma.alertaUrl}
              target="_blank"
              rel="noreferrer"
            >
              {clusterEntity.spec.lma.alertaUrl}
            </Link>
          ) : (
            strings.clusterPage.common.emptyValue()
          )}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.lmaInformation.alertManager()}
        >
          {clusterEntity.spec.lma.alertManagerUrl ? (
            <Link
              href={clusterEntity.spec.lma.alertManagerUrl}
              target="_blank"
              rel="noreferrer"
            >
              {clusterEntity.spec.lma.alertManagerUrl}
            </Link>
          ) : (
            strings.clusterPage.common.emptyValue()
          )}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.lmaInformation.grafana()}
        >
          {clusterEntity.spec.lma.grafanaUrl ? (
            <Link
              href={clusterEntity.spec.lma.grafanaUrl}
              target="_blank"
              rel="noreferrer"
            >
              {clusterEntity.spec.lma.grafanaUrl}
            </Link>
          ) : (
            strings.clusterPage.common.emptyValue()
          )}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.lmaInformation.kibana()}
        >
          {clusterEntity.spec.lma.kibanaUrl ? (
            <Link
              href={clusterEntity.spec.lma.kibanaUrl}
              target="_blank"
              rel="noreferrer"
            >
              {clusterEntity.spec.lma.kibanaUrl}
            </Link>
          ) : (
            strings.clusterPage.common.emptyValue()
          )}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.lmaInformation.prometheus()}
        >
          {clusterEntity.spec.lma.prometheusUrl ? (
            <Link
              href={clusterEntity.spec.lma.prometheusUrl}
              target="_blank"
              rel="noreferrer"
            >
              {clusterEntity.spec.lma.prometheusUrl}
            </Link>
          ) : (
            strings.clusterPage.common.emptyValue()
          )}
        </DrawerItem>
      </DrawerItemsWrapper>
    </>
  );
};

LmaInformation.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
