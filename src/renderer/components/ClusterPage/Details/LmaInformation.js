import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import * as strings from '../../../../strings';
import { layout } from '../../styles';
import { PanelTitle } from '../PanelTitle';

const {
  Component: { DrawerItem },
} = Renderer;

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

const Link = styled.a(() => ({
  color: 'var(--primary)',
}));

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
