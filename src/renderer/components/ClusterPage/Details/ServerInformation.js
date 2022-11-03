import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import * as strings from '../../../../strings';
import { layout } from '../../styles';
import { formatDate } from '../../../rendererUtil';
import { getProvider } from '../helpers';
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

const Link = styled.a(() => ({
  color: 'var(--primary)',
}));

//
// MAIN COMPONENT
//

export const ServerInformation = ({ clusterEntity }) => {
  //
  // RENDER
  //

  const browserUrl = `${clusterEntity.metadata.cloudUrl}/projects/${clusterEntity.metadata.namespace}/clusters/${clusterEntity.metadata.name}`;

  return (
    <>
      <DrawerTitleWrapper>
        <PanelTitle
          title={strings.clusterPage.pages.details.mirantisContainerCloud.title()}
        />
      </DrawerTitleWrapper>
      <DrawerItemsWrapper>
        <DrawerItem
          name={strings.clusterPage.pages.details.mirantisContainerCloud.uid()}
        >
          {clusterEntity.metadata.uid || unknownValue()}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.mirantisContainerCloud.dateCreated()}
        >
          {formatDate(clusterEntity.spec.createdAt)}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.mirantisContainerCloud.managementCluster()}
        >
          {strings.clusterPage.pages.details.mirantisContainerCloud.isManagementCluster(
            clusterEntity.spec.isMgmtCluster
          ) || unknownValue()}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.mirantisContainerCloud.clusterUrl()}
        >
          {strings ? (
            <Link href={browserUrl} target="_blank" rel="noreferrer">
              {browserUrl}
            </Link>
          ) : (
            unknownValue()
          )}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.mirantisContainerCloud.region()}
        >
          {clusterEntity.spec.region || unknownValue()}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.mirantisContainerCloud.provider()}
        >
          {getProvider(clusterEntity.spec.provider)}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.mirantisContainerCloud.release()}
        >
          {clusterEntity.spec.currentVersion || unknownValue()}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.mirantisContainerCloud.managers()}
        >
          {clusterEntity.spec.controllerCount ?? unknownValue()}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.mirantisContainerCloud.workers()}
        >
          {clusterEntity.spec.workerCount ?? unknownValue()}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.mirantisContainerCloud.mkeDashboard()}
        >
          {clusterEntity.spec.dashboardUrl ? (
            <Link
              href={clusterEntity.spec.dashboardUrl}
              target="_blank"
              rel="noreferrer"
            >
              {clusterEntity.spec.dashboardUrl}
            </Link>
          ) : (
            unknownValue()
          )}
        </DrawerItem>
      </DrawerItemsWrapper>
    </>
  );
};

ServerInformation.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
