import propTypes from 'prop-types';
import { Renderer } from '@k8slens/extensions';
import * as strings from '../../../../strings';
import { formatDate } from '../../../rendererUtil';
import { getProvider } from '../clusterPageUtil';
import { generateEntityUrl } from '../../../../catalog/catalogEntities';
import { PanelTitle } from '../PanelTitle';
import {
  DrawerTitleWrapper,
  DrawerItemsWrapper,
  Link,
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

export const ServerInformation = ({ clusterEntity }) => {
  //
  // RENDER
  //

  return (
    <>
      <DrawerTitleWrapper>
        <PanelTitle
          title={strings.clusterPage.pages.details.serverInformation.title()}
        />
      </DrawerTitleWrapper>
      <DrawerItemsWrapper>
        <DrawerItem
          name={strings.clusterPage.pages.details.serverInformation.uid()}
        >
          {clusterEntity.metadata.uid || unknownValue()}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.serverInformation.dateCreated()}
        >
          {formatDate(clusterEntity.spec.createdAt)}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.serverInformation.managementCluster()}
        >
          {strings.clusterPage.pages.details.serverInformation.isManagementCluster(
            clusterEntity.spec.isMgmtCluster
          ) || unknownValue()}
        </DrawerItem>
        <DrawerItem name={strings.clusterPage.common.clusterUrl()}>
          <Link
            href={generateEntityUrl(clusterEntity)}
            target="_blank"
            rel="noreferrer"
          >
            {generateEntityUrl(clusterEntity)}
          </Link>
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.serverInformation.region()}
        >
          {clusterEntity.spec.region || unknownValue()}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.serverInformation.provider()}
        >
          {getProvider(clusterEntity.spec.provider)}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.serverInformation.release()}
        >
          {clusterEntity.spec.currentVersion || unknownValue()}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.serverInformation.managers()}
        >
          {clusterEntity.spec.controllerCount ?? unknownValue()}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.serverInformation.workers()}
        >
          {clusterEntity.spec.workerCount ?? unknownValue()}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.details.serverInformation.dashboardUrl()}
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
