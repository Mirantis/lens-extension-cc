import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../../styles';
import * as strings from '../../../../strings';
import * as consts from '../../../../constants';
import { getDateValue } from '../../../catalogEntityDetails';
import { AwsIcon } from '../icons/AwsIcon';
import { AzureIcon } from '../icons/AzureIcon';
import { ByoIcon } from '../icons/ByoIcon';
import { EquinixIcon } from '../icons/EquinixIcon';
import { OpenstackIcon } from '../icons/OpenstackIcon';
import { VsphereIcon } from '../icons/VsphereIcon';

const {
  Component: { DrawerTitle, DrawerItem, Icon },
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

const IconWrapper = styled.span(() => ({
  display: 'inline-block',
  marginRight: layout.grid * 3,
}));

const EntityCell = styled.td(() => ({
  display: 'flex',
  alignItems: 'center',
  marginRight: layout.grid * 3.5,
  minWidth: layout.grid * 30,
}));

const ProviderWrapper = styled.span(() => ({
  display: 'flex',
  alignItems: 'center',
}));

const MccStatus = styled.p`
  color: var(--colorSuccess);
  color: ${({ isReady }) =>
    isReady ? 'var(--colorSuccess)' : 'var(--textColorPrimary)'};
`;

export const SummaryPanel = ({ clusterEntity }) => {
  //
  // EVENTS
  //

  /**
   * Returns provider icon with it name.
   * @param {string} provider Provider name.
   * @returns {HTMLElement} Provider info, including icon and name.
   */
  const getProvider = (provider) => {
    switch (provider) {
      case consts.providerTypes.AWS:
        return (
          <ProviderWrapper>
            <IconWrapper>
              <AwsIcon size={17} fill="var(--textColorPrimary)" />
            </IconWrapper>
            {provider}
          </ProviderWrapper>
        );
      case consts.providerTypes.AZURE:
        return (
          <ProviderWrapper>
            <IconWrapper>
              <AzureIcon size={18} fill="var(--textColorPrimary)" />
            </IconWrapper>
            {provider}
          </ProviderWrapper>
        );
      case consts.providerTypes.BYO:
        return (
          <ProviderWrapper>
            <IconWrapper>
              <ByoIcon size={12} fill="var(--textColorPrimary)" />
            </IconWrapper>
            {provider}
          </ProviderWrapper>
        );
      case consts.providerTypes.EQUINIX:
        return (
          <ProviderWrapper>
            <IconWrapper>
              <EquinixIcon size={18} fill="var(--textColorPrimary)" />
            </IconWrapper>
            {provider}
          </ProviderWrapper>
        );
      case consts.providerTypes.OPENSTACK:
        return (
          <ProviderWrapper>
            <IconWrapper>
              <OpenstackIcon size={20} fill="var(--textColorPrimary)" />
            </IconWrapper>
            {provider}
          </ProviderWrapper>
        );
      case consts.providerTypes.VSPHERE:
        return (
          <ProviderWrapper>
            <IconWrapper>
              <VsphereIcon size={8} fill="var(--textColorPrimary)" />
            </IconWrapper>
            {provider}
          </ProviderWrapper>
        );
      default:
        return <>{strings.catalog.entities.common.details.unknownValue()}</>;
    }
  };

  /**
   * Get string of entity labels and returns count of them
   * @param {string} clusterLabels Cluster labels.
   * @returns {string} String with count of entity labels.
   */
  const getClusterLabelsCount = (clusterLabels) => {
    return clusterLabels ? `${clusterLabels.split(',').length} ` : '0 ';
  };

  //
  // RENDER
  //

  const browserUrl = `${clusterEntity.metadata.cloudUrl}/projects/${clusterEntity.metadata.namespace}/clusters/${clusterEntity.metadata.name}`;

  return (
    <>
      <DrawerTitleWrapper>
        <DrawerTitle>
          {strings.clusterPage.pages.overview.summary.title()}
        </DrawerTitle>
      </DrawerTitleWrapper>

      <DrawerItemsWrapper>
        <DrawerItem
          name={strings.clusterPage.pages.overview.summary.clusterName()}
        >
          {clusterEntity.metadata.name || unknownValue()}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.overview.summary.mccStatus()}
        >
          {clusterEntity.spec.apiStatus ? (
            <MccStatus isReady={clusterEntity.spec.apiStatus === 'Ready'}>
              {clusterEntity.spec.apiStatus}
            </MccStatus>
          ) : (
            unknownValue()
          )}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.overview.summary.syncTime()}
        >
          {clusterEntity.metadata.syncedAt
            ? getDateValue(clusterEntity.metadata.syncedAt)
            : unknownValue()}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.overview.summary.provider()}
        >
          {clusterEntity.spec.provider
            ? getProvider(clusterEntity.spec.provider)
            : unknownValue()}
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
        <DrawerItem
          name={strings.clusterPage.pages.overview.summary.clusterUrl()}
        >
          {browserUrl ? (
            <ClusterLink href={browserUrl} target="_blank" rel="noreferrer">
              {browserUrl}
            </ClusterLink>
          ) : (
            unknownValue()
          )}
        </DrawerItem>
        <DrawerItem
          name={strings.clusterPage.pages.overview.summary.clusterObjects.title()}
        >
          {!clusterEntity.spec.isMgmtCluster ? (
            <table>
              <tbody>
                <tr>
                  <EntityCell>
                    <IconWrapper>
                      <Icon material="verified_user" />
                    </IconWrapper>
                    {strings.clusterPage.pages.overview.summary.clusterObjects.credentials(
                      getClusterLabelsCount(
                        clusterEntity.metadata.labels['credential']
                      )
                    )}
                    :
                  </EntityCell>
                  <td>{clusterEntity.metadata.labels['credential'] || '--'}</td>
                </tr>
              </tbody>
            </table>
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
            <table>
              <tbody>
                <tr>
                  <EntityCell>
                    <IconWrapper>
                      <Icon material="vpn_key" />
                    </IconWrapper>
                    {strings.clusterPage.pages.overview.summary.clusterObjects.sshKeys(
                      getClusterLabelsCount(
                        clusterEntity.metadata.labels['ssh-key']
                      )
                    )}
                    :
                  </EntityCell>
                  <td>{clusterEntity.metadata.labels['ssh-key'] || '--'}</td>
                </tr>
              </tbody>
            </table>
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
            <table>
              <tbody>
                <tr>
                  <EntityCell>
                    <IconWrapper>
                      <Icon material="card_membership" />
                    </IconWrapper>
                    {strings.clusterPage.pages.overview.summary.clusterObjects.rhelLicenses(
                      getClusterLabelsCount(
                        clusterEntity.metadata.labels['license']
                      )
                    )}
                    :
                  </EntityCell>
                  <td>{clusterEntity.metadata.labels['license'] || '--'}</td>
                </tr>
              </tbody>
            </table>
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
            <table>
              <tbody>
                <tr>
                  <EntityCell>
                    <IconWrapper>
                      <Icon material="assistant_direction" />
                    </IconWrapper>
                    {strings.clusterPage.pages.overview.summary.clusterObjects.proxies(
                      getClusterLabelsCount(
                        clusterEntity.metadata.labels['proxy']
                      )
                    )}
                    :
                  </EntityCell>
                  <td>{clusterEntity.metadata.labels['proxy'] || '--'}</td>
                </tr>
              </tbody>
            </table>
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
