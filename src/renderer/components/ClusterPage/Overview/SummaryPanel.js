import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../../styles';
import * as strings from '../../../../strings';
import { formatDate } from '../../../rendererUtil';
import { PanelTitle } from '../PanelTitle';
import { getProvider } from '../clusterPageUtil';
import { generateEntityUrl } from '../../../../catalog/catalogEntities';

const {
  Component: { DrawerItem, Icon },
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

const ClusterLink = styled.a(() => ({
  color: 'var(--primary)',
}));

const IconWrapper = styled.div(() => ({
  display: 'inline-block',
  marginRight: layout.grid * 3,
}));

const EntityWrapper = styled.div(() => ({
  display: 'inline-flex',
  alignItems: 'center',
  marginRight: layout.grid * 3.5,
  minWidth: layout.grid * 32.5,
}));

const ServerStatus = styled.p`
  color: var(--colorSuccess);
  color: ${({ isReady }) =>
    isReady ? 'var(--colorSuccess)' : 'var(--textColorPrimary)'};
`;

/**
 * Get string of entity labels and returns count of them
 * @param {string} clusterLabels Cluster labels.
 * @returns {string} String with count of entity labels.
 */
const getClusterLabelsCount = (clusterLabels) => {
  return clusterLabels ? `${clusterLabels.split(',').length} ` : '0 ';
};

export const SummaryPanel = ({ clusterEntity }) => {
  //
  // RENDER
  //

  return (
    <>
      <DrawerTitleWrapper>
        <PanelTitle
          title={strings.clusterPage.pages.overview.summary.title()}
        />
      </DrawerTitleWrapper>

      <DrawerItemsWrapper>
        <DrawerItem
          name={strings.clusterPage.pages.overview.summary.clusterName()}
        >
          {clusterEntity.metadata.name || unknownValue()}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.overview.summary.serverStatus()}
        >
          {clusterEntity.spec.apiStatus ? (
            <ServerStatus isReady={clusterEntity.spec.apiStatus === 'Ready'}>
              {clusterEntity.spec.apiStatus}
            </ServerStatus>
          ) : (
            unknownValue()
          )}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.overview.summary.lastSync()}
        >
          {formatDate(clusterEntity.metadata.syncedAt)}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.overview.summary.provider()}
        >
          {getProvider(clusterEntity.spec.provider)}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.overview.summary.managementCluster()}
        >
          {strings.clusterPage.pages.overview.summary.isManagementCluster(
            clusterEntity.spec.isMgmtCluster
          ) || unknownValue()}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.overview.summary.releaseVersion()}
        >
          {clusterEntity.spec.currentVersion || unknownValue()}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.overview.summary.namespace()}
        >
          {clusterEntity.metadata.namespace || unknownValue()}
        </DrawerItem>
        <DrawerItem name={strings.clusterPage.common.clusterUrl()}>
          <ClusterLink
            href={generateEntityUrl(clusterEntity)}
            target="_blank"
            rel="noreferrer"
          >
            {generateEntityUrl(clusterEntity)}
          </ClusterLink>
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.overview.summary.clusterObjects.title()}
        >
          {!clusterEntity.spec.isMgmtCluster ? (
            <div>
              <EntityWrapper>
                <IconWrapper>
                  <Icon material="verified_user" />
                </IconWrapper>
                {strings.clusterPage.pages.overview.summary.clusterObjects.credentials(
                  getClusterLabelsCount(
                    clusterEntity.metadata.labels['credential']
                  )
                )}
                :
              </EntityWrapper>
              <span>
                {clusterEntity.metadata.labels['credential'] ||
                  strings.clusterPage.common.emptyValue()}
              </span>
            </div>
          ) : (
            <>
              <IconWrapper>
                <Icon material="verified_user" />
              </IconWrapper>
              {getClusterLabelsCount(
                clusterEntity.metadata.labels['credential']
              )}
              {strings.clusterPage.pages.overview.summary.clusterObjects.credentials(
                getClusterLabelsCount(
                  clusterEntity.metadata.labels['credential']
                )
              )}
            </>
          )}
        </DrawerItem>
        <DrawerItem>
          {!clusterEntity.spec.isMgmtCluster ? (
            <div>
              <EntityWrapper>
                <IconWrapper>
                  <Icon material="vpn_key" />
                </IconWrapper>
                {strings.clusterPage.pages.overview.summary.clusterObjects.sshKeys(
                  getClusterLabelsCount(
                    clusterEntity.metadata.labels['ssh-key']
                  )
                )}
                :
              </EntityWrapper>
              <span>
                {clusterEntity.metadata.labels['ssh-key'] ||
                  strings.clusterPage.common.emptyValue()}
              </span>
            </div>
          ) : (
            <>
              <IconWrapper>
                <Icon material="vpn_key" />
              </IconWrapper>
              {getClusterLabelsCount(clusterEntity.metadata.labels['ssh-key'])}
              {strings.clusterPage.pages.overview.summary.clusterObjects.sshKeys(
                getClusterLabelsCount(clusterEntity.metadata.labels['ssh-key'])
              )}
            </>
          )}
        </DrawerItem>
        <DrawerItem>
          {!clusterEntity.spec.isMgmtCluster ? (
            <div>
              <EntityWrapper>
                <IconWrapper>
                  <Icon material="card_membership" />
                </IconWrapper>
                {strings.clusterPage.pages.overview.summary.clusterObjects.rhelLicenses(
                  getClusterLabelsCount(
                    clusterEntity.metadata.labels['license']
                  )
                )}
                :
              </EntityWrapper>
              <span>
                {clusterEntity.metadata.labels['license'] ||
                  strings.clusterPage.common.emptyValue()}
              </span>
            </div>
          ) : (
            <>
              <IconWrapper>
                <Icon material="card_membership" />
              </IconWrapper>
              {getClusterLabelsCount(clusterEntity.metadata.labels['license'])}
              {strings.clusterPage.pages.overview.summary.clusterObjects.rhelLicenses(
                getClusterLabelsCount(clusterEntity.metadata.labels['license'])
              )}
            </>
          )}
        </DrawerItem>
        <DrawerItem>
          {!clusterEntity.spec.isMgmtCluster ? (
            <div>
              <EntityWrapper>
                <IconWrapper>
                  <Icon material="assistant_direction" />
                </IconWrapper>
                {strings.clusterPage.pages.overview.summary.clusterObjects.proxies(
                  getClusterLabelsCount(clusterEntity.metadata.labels['proxy'])
                )}
                :
              </EntityWrapper>
              <span>
                {clusterEntity.metadata.labels['proxy'] ||
                  strings.clusterPage.common.emptyValue()}
              </span>
            </div>
          ) : (
            <>
              <IconWrapper>
                <Icon material="assistant_direction" />
              </IconWrapper>
              {getClusterLabelsCount(clusterEntity.metadata.labels['proxy'])}
              {strings.clusterPage.pages.overview.summary.clusterObjects.proxies(
                getClusterLabelsCount(clusterEntity.metadata.labels['proxy'])
              )}
            </>
          )}
        </DrawerItem>
      </DrawerItemsWrapper>
    </>
  );
};

SummaryPanel.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};