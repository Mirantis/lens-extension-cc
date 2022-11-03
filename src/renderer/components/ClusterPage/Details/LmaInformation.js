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

export const LmaInformation = ({ lma }) => {
  //
  // RENDER
  //

  return (
    <>
      <DrawerTitleWrapper>
        <PanelTitle
          title={strings.clusterPage.pages.details.mirantisStacklight.title()}
        />
      </DrawerTitleWrapper>
      <DrawerItemsWrapper>
        <DrawerItem
          name={strings.clusterPage.pages.details.mirantisStacklight.alerta()}
        >
          {lma.alertaUrl ? (
            <Link href={lma.alertaUrl} target="_blank" rel="noreferrer">
              {lma.alertaUrl}
            </Link>
          ) : (
            strings.clusterPage.common.emptyValue()
          )}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.mirantisStacklight.alertManager()}
        >
          {lma.alertManagerUrl ? (
            <Link href={lma.alertManagerUrl} target="_blank" rel="noreferrer">
              {lma.alertManagerUrl}
            </Link>
          ) : (
            strings.clusterPage.common.emptyValue()
          )}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.mirantisStacklight.grafana()}
        >
          {lma.grafanaUrl ? (
            <Link href={lma.grafanaUrl} target="_blank" rel="noreferrer">
              {lma.grafanaUrl}
            </Link>
          ) : (
            strings.clusterPage.common.emptyValue()
          )}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.mirantisStacklight.kibana()}
        >
          {lma.kibanaUrl ? (
            <Link href={lma.kibanaUrl} target="_blank" rel="noreferrer">
              {lma.kibanaUrl}
            </Link>
          ) : (
            strings.clusterPage.common.emptyValue()
          )}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.mirantisStacklight.prometheus()}
        >
          {lma.prometheusUrl ? (
            <Link href={lma.prometheusUrl} target="_blank" rel="noreferrer">
              {lma.prometheusUrl}
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
  lma: propTypes.object.isRequired,
};
