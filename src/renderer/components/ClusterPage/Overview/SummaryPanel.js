import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../../styles';
import * as strings from '../../../../strings';
import { formatDate } from '../../../rendererUtil';
import { PanelTitle } from '../PanelTitle';
import { getProvider } from '../clusterPageUtil';
import { generateEntityUrl } from '../../../../catalog/catalogEntities';
import {
  DrawerTitleWrapper,
  DrawerItemsWrapper,
  Link,
} from '../clusterPageComponents';

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
 * Determine the number of items in a given cluster label.
 * @param {string|null} label Label on a cluster containing a comma-delimited list of values
 *  like credential or SSH key names.
 * @returns {number} Count of entity labels.
 */
const getLabelCount = (label) => {
  return label ? label.split(',').length : 0;
};

/**
 * Pretty-prints a given cluster label.
 * @param {string|null} label Label on a cluster containing a comma-delimited list of values
 *  like credential or SSH key names.
 * @returns {string} Pretty string version of the label.
 */
const prettyPrintLabel = (clusterLabel) =>
  (clusterLabel && clusterLabel.split(',').join(', ')) ||
  strings.clusterPage.common.emptyValue();

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
          name={strings.clusterPage.pages.overview.summary.namespace()}
        >
          {clusterEntity.metadata.namespace || unknownValue()}
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
          name={strings.clusterPage.pages.overview.summary.clusterObjects.title()}
        >
          {!clusterEntity.spec.isMgmtCluster ? (
            <div>
              <EntityWrapper>
                <IconWrapper>
                  <Icon material="verified_user" />
                </IconWrapper>
                {strings.clusterPage.pages.overview.summary.clusterObjects.credentials(
                  getLabelCount(clusterEntity.metadata.labels['credential'])
                )}
                :
              </EntityWrapper>
              <span>
                {prettyPrintLabel(clusterEntity.metadata.labels['credential'])}
              </span>
            </div>
          ) : (
            <>
              <IconWrapper>
                <Icon material="verified_user" />
              </IconWrapper>
              {getLabelCount(clusterEntity.metadata.labels['credential'])}{' '}
              {strings.clusterPage.pages.overview.summary.clusterObjects.credentials(
                getLabelCount(clusterEntity.metadata.labels['credential'])
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
                  getLabelCount(clusterEntity.metadata.labels['ssh-key'])
                )}
                :
              </EntityWrapper>
              <span>
                {prettyPrintLabel(clusterEntity.metadata.labels['ssh-key'])}
              </span>
            </div>
          ) : (
            <>
              <IconWrapper>
                <Icon material="vpn_key" />
              </IconWrapper>
              {getLabelCount(clusterEntity.metadata.labels['ssh-key'])}{' '}
              {strings.clusterPage.pages.overview.summary.clusterObjects.sshKeys(
                getLabelCount(clusterEntity.metadata.labels['ssh-key'])
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
                  getLabelCount(clusterEntity.metadata.labels['license'])
                )}
                :
              </EntityWrapper>
              <span>
                {prettyPrintLabel(clusterEntity.metadata.labels['license'])}
              </span>
            </div>
          ) : (
            <>
              <IconWrapper>
                <Icon material="card_membership" />
              </IconWrapper>
              {getLabelCount(clusterEntity.metadata.labels['license'])}{' '}
              {strings.clusterPage.pages.overview.summary.clusterObjects.rhelLicenses(
                getLabelCount(clusterEntity.metadata.labels['license'])
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
                  getLabelCount(clusterEntity.metadata.labels['proxy'])
                )}
                :
              </EntityWrapper>
              <span>
                {prettyPrintLabel(clusterEntity.metadata.labels['proxy'])}
              </span>
            </div>
          ) : (
            <>
              <IconWrapper>
                <Icon material="assistant_direction" />
              </IconWrapper>
              {getLabelCount(clusterEntity.metadata.labels['proxy'])}{' '}
              {strings.clusterPage.pages.overview.summary.clusterObjects.proxies(
                getLabelCount(clusterEntity.metadata.labels['proxy'])
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
