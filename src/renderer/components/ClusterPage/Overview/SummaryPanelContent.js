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

const { Icon } = Renderer.Component;

//
// INTERNAL STYLED COMPONENTS
//

const SummaryTable = styled.table(() => ({
  fontSize: 'calc(var(--font-size) * .93)',
  width: '100%',
}));

const TableRow = styled.tr(() => ({
  borderBottom: '1px solid var(--borderFaintColor)',
}));

const LabelCell = styled.td(() => ({
  paddingTop: layout.grid * 3,
  paddingBottom: layout.grid * 3,
  paddingRight: layout.grid * 22,
  verticalAlign: 'top',
}));

const ValueCell = styled.td(() => ({
  paddingTop: layout.grid * 3,
  paddingBottom: layout.grid * 3,
  verticalAlign: 'top',
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
  minWidth: layout.grid * 28.5,
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

export const SummaryPanelContent = ({ clusterEntity }) => {
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
    <SummaryTable>
      <tbody>
        <TableRow>
          <LabelCell>
            {strings.clusterPage.pages.overview.summary.clusterName()}
          </LabelCell>
          <ValueCell>{clusterEntity.metadata.name}</ValueCell>
        </TableRow>
        <TableRow>
          <LabelCell>
            {strings.clusterPage.pages.overview.summary.mccStatus()}
          </LabelCell>
          <ValueCell>
            <MccStatus isReady={clusterEntity.spec.apiStatus === 'Ready'}>
              {clusterEntity.spec.apiStatus}
            </MccStatus>
          </ValueCell>
        </TableRow>
        <TableRow>
          <LabelCell>
            {strings.clusterPage.pages.overview.summary.syncTime()}
          </LabelCell>
          <ValueCell>{getDateValue(clusterEntity.metadata.syncedAt)}</ValueCell>
        </TableRow>
        <TableRow>
          <LabelCell>
            {strings.clusterPage.pages.overview.summary.provider()}
          </LabelCell>
          <ValueCell>{getProvider(clusterEntity.spec.provider)}</ValueCell>
        </TableRow>
        <TableRow>
          <LabelCell>
            {strings.clusterPage.pages.overview.summary.managementCluster()}
          </LabelCell>
          <ValueCell>
            {strings.clusterPage.pages.overview.summary.isManagementCluster(
              clusterEntity.spec.isMgmtCluster
            )}
          </ValueCell>
        </TableRow>
        <TableRow>
          <LabelCell>
            {strings.clusterPage.pages.overview.summary.releaseVersion()}
          </LabelCell>
          <ValueCell>{clusterEntity.spec.currentVersion}</ValueCell>
        </TableRow>
        <TableRow>
          <LabelCell>
            {strings.clusterPage.pages.overview.summary.namespace()}
          </LabelCell>
          <ValueCell>{clusterEntity.metadata.namespace}</ValueCell>
        </TableRow>
        <TableRow>
          <LabelCell>
            {strings.clusterPage.pages.overview.summary.clusterUrl()}
          </LabelCell>
          <ValueCell>
            <ClusterLink href={browserUrl} target="_blank" rel="noreferrer">
              {browserUrl}
            </ClusterLink>
          </ValueCell>
        </TableRow>
        <TableRow>
          <LabelCell>
            {strings.clusterPage.pages.overview.summary.clusterObjects.title()}
          </LabelCell>
          <ValueCell>
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
                    <td>
                      {clusterEntity.metadata.labels['credential'] || '--'}
                    </td>
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
          </ValueCell>
        </TableRow>
        <TableRow>
          <LabelCell></LabelCell>
          <ValueCell>
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
                {getClusterLabelsCount(
                  clusterEntity.metadata.labels['ssh-key']
                )}
                {strings.clusterPage.pages.overview.summary.clusterObjects.sshKeys(
                  getClusterLabelsCount(
                    clusterEntity.metadata.labels['ssh-key']
                  )
                )}
              </>
            )}
          </ValueCell>
        </TableRow>
        <TableRow>
          <LabelCell></LabelCell>
          <ValueCell>
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
                {getClusterLabelsCount(
                  clusterEntity.metadata.labels['license']
                )}
                {strings.clusterPage.pages.overview.summary.clusterObjects.rhelLicenses(
                  getClusterLabelsCount(
                    clusterEntity.metadata.labels['license']
                  )
                )}
              </>
            )}
          </ValueCell>
        </TableRow>
        <TableRow>
          <LabelCell></LabelCell>
          <ValueCell>
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
          </ValueCell>
        </TableRow>
      </tbody>
    </SummaryTable>
  );
};

SummaryPanelContent.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
