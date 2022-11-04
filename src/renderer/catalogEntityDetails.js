/* eslint-disable react/prop-types -- All components are inline */

import { useCallback } from 'react';
import { Renderer } from '@k8slens/extensions';
import { SshKeyEntity } from '../catalog/SshKeyEntity';
import { CredentialEntity } from '../catalog/CredentialEntity';
import { ProxyEntity } from '../catalog/ProxyEntity';
import { LicenseEntity } from '../catalog/LicenseEntity';
import * as strings from '../strings';
import * as consts from '../constants';
import { openBrowser } from '../util/netUtil';
import { formatDate } from './rendererUtil';

const {
  catalog: {
    entities: {
      common: {
        details: { unknownValue, emptyValue },
      },
    },
  },
} = strings;

const {
  Component: { DrawerTitle, DrawerItem },
} = Renderer;

export const catalogEntityDetails = [
  {
    kind: consts.catalog.entities.kubeCluster.kind,
    apiVersions: [
      `${consts.catalog.entities.kubeCluster.group}/${consts.catalog.entities.kubeCluster.versions.v1alpha1}`,
    ],
    components: {
      Details: (props) => {
        const handleOpenDashboard = useCallback(
          (event) => {
            event.preventDefault();
            openBrowser(props.entity.spec.dashboardUrl);
          },
          [props.entity.spec.dashboardUrl]
        );

        const handleOpenAlerta = useCallback(
          (event) => {
            event.preventDefault();
            openBrowser(props.entity.spec.lma.alertaUrl);
          },
          [props.entity.spec.lma?.alertaUrl]
        );
        const handleOpenAlertManager = useCallback(
          (event) => {
            event.preventDefault();
            openBrowser(props.entity.spec.lma.alertManagerUrl);
          },
          [props.entity.spec.lma?.alertManagerUrl]
        );
        const handleOpenGrafana = useCallback(
          (event) => {
            event.preventDefault();
            openBrowser(props.entity.spec.lma.grafanaUrl);
          },
          [props.entity.spec.lma?.grafanaUrl]
        );
        const handleOpenKibana = useCallback(
          (event) => {
            event.preventDefault();
            openBrowser(props.entity.spec.lma.kibanaUrl);
          },
          [props.entity.spec.lma?.kibanaUrl]
        );
        const handleOpenPrometheus = useCallback(
          (event) => {
            event.preventDefault();
            openBrowser(props.entity.spec.lma.prometheusUrl);
          },
          [props.entity.spec.lma?.prometheusUrl]
        );
        const handleOpenTelemeterServer = useCallback(
          (event) => {
            event.preventDefault();
            openBrowser(props.entity.spec.lma.telemeterServerUrl);
          },
          [props.entity.spec.lma?.telemeterServerUrl]
        );

        return (
          <>
            <DrawerTitle>
              {strings.catalog.entities.common.details.title()}
            </DrawerTitle>
            <DrawerItem
              name={strings.catalog.entities.common.details.props.uid()}
            >
              {props.entity.metadata.uid || unknownValue()}
            </DrawerItem>
            <DrawerItem
              name={strings.catalog.entities.common.details.props.dateCreated()}
            >
              {formatDate(props.entity.spec.createdAt) || unknownValue()}
            </DrawerItem>
            <DrawerItem
              name={strings.catalog.entities.cluster.details.props.managementCluster()}
            >
              {strings.catalog.entities.cluster.details.props.isManagementCluster(
                props.entity.spec.isMgmtCluster
              ) || unknownValue()}
            </DrawerItem>
            {props.entity.spec.isMgmtCluster && (
              <>
                <DrawerItem
                  name={strings.catalog.entities.cluster.details.props.url()}
                >
                  {props.entity.metadata.cloudUrl || unknownValue()}
                </DrawerItem>
              </>
            )}
            <DrawerItem
              name={strings.catalog.entities.cluster.details.props.region()}
            >
              {props.entity.spec.region || unknownValue()}
            </DrawerItem>
            <DrawerItem
              name={strings.catalog.entities.cluster.details.props.provider()}
            >
              {props.entity.spec.provider || unknownValue()}
            </DrawerItem>
            <DrawerItem
              name={strings.catalog.entities.common.details.props.serverStatus()}
            >
              {props.entity.spec.apiStatus || unknownValue()}
            </DrawerItem>
            <DrawerItem
              name={strings.catalog.entities.cluster.details.props.release()}
            >
              {props.entity.spec.currentVersion || unknownValue()}
            </DrawerItem>
            <DrawerItem
              name={strings.catalog.entities.cluster.details.props.managers()}
            >
              {props.entity.spec.controllerCount ?? unknownValue()}
            </DrawerItem>
            <DrawerItem
              name={strings.catalog.entities.cluster.details.props.workers()}
            >
              {props.entity.spec.workerCount ?? unknownValue()}
            </DrawerItem>
            <DrawerItem
              name={strings.catalog.entities.cluster.details.props.dashboardUrl()}
            >
              {props.entity.spec.dashboardUrl ? (
                <a href="#" onClick={handleOpenDashboard}>
                  {props.entity.spec.dashboardUrl}
                </a>
              ) : (
                unknownValue()
              )}
            </DrawerItem>
            <DrawerTitle>
              {strings.catalog.entities.cluster.details.props.lma()}
            </DrawerTitle>
            <DrawerItem
              name={strings.catalog.entities.cluster.details.props.lmaEnabled()}
            >
              {strings.catalog.entities.cluster.details.props.isLmaEnabled(
                !!props.entity.spec.lma
              )}
            </DrawerItem>

            <DrawerItem
              name={strings.catalog.entities.cluster.details.props.alertaUrl()}
            >
              {props.entity.spec.lma?.alertaUrl ? (
                <a href="#" onClick={handleOpenAlerta}>
                  {props.entity.spec.lma?.alertaUrl}
                </a>
              ) : (
                emptyValue()
              )}
            </DrawerItem>

            <DrawerItem
              name={strings.catalog.entities.cluster.details.props.alertManagerUrl()}
            >
              {props.entity.spec.lma?.alertManagerUrl ? (
                <a href="#" onClick={handleOpenAlertManager}>
                  {props.entity.spec.lma?.alertManagerUrl}
                </a>
              ) : (
                emptyValue()
              )}
            </DrawerItem>

            <DrawerItem
              name={strings.catalog.entities.cluster.details.props.grafanaUrl()}
            >
              {props.entity.spec.lma?.grafanaUrl ? (
                <a href="#" onClick={handleOpenGrafana}>
                  {props.entity.spec.lma?.grafanaUrl}
                </a>
              ) : (
                emptyValue()
              )}
            </DrawerItem>

            <DrawerItem
              name={strings.catalog.entities.cluster.details.props.kibanaUrl()}
            >
              {props.entity.spec.lma?.kibanaUrl ? (
                <a href="#" onClick={handleOpenKibana}>
                  {props.entity.spec.lma?.kibanaUrl}
                </a>
              ) : (
                emptyValue()
              )}
            </DrawerItem>

            <DrawerItem
              name={strings.catalog.entities.cluster.details.props.prometheusUrl()}
            >
              {props.entity.spec.lma?.prometheusUrl ? (
                <a href="#" onClick={handleOpenPrometheus}>
                  {props.entity.spec.lma?.prometheusUrl}
                </a>
              ) : (
                emptyValue()
              )}
            </DrawerItem>

            <DrawerItem
              name={strings.catalog.entities.cluster.details.props.telemeterServerUrl()}
            >
              {props.entity.spec.lma?.telemeterServerUrl ? (
                <a href="#" onClick={handleOpenTelemeterServer}>
                  {props.entity.spec.lma?.telemeterServerUrl}
                </a>
              ) : (
                emptyValue()
              )}
            </DrawerItem>
            <DrawerTitle>
              {strings.catalog.entities.common.details.props.lensExtension()}
            </DrawerTitle>
            <DrawerItem
              name={strings.catalog.entities.common.details.props.lastSync()}
            >
              {formatDate(props.entity.metadata.syncedAt)}
            </DrawerItem>
          </>
        );
      },
    },
  },
  {
    kind: SshKeyEntity.kind,
    apiVersions: [SshKeyEntity.apiVersion],
    components: {
      Details: (props) => (
        <>
          <DrawerTitle>
            {strings.catalog.entities.common.details.title()}
          </DrawerTitle>
          <DrawerItem
            name={strings.catalog.entities.common.details.props.uid()}
          >
            {props.entity.metadata.uid || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.common.details.props.dateCreated()}
          >
            {formatDate(props.entity.spec.createdAt) || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.sshKey.details.props.publicKey()}
          >
            {props.entity.spec.publicKey || unknownValue()}
          </DrawerItem>
          <DrawerTitle>
            {strings.catalog.entities.common.details.props.lensExtension()}
          </DrawerTitle>
          <DrawerItem
            name={strings.catalog.entities.common.details.props.lastSync()}
          >
            {formatDate(props.entity.metadata.syncedAt)}
          </DrawerItem>
        </>
      ),
    },
  },
  {
    kind: CredentialEntity.kind,
    apiVersions: [CredentialEntity.apiVersion],
    components: {
      Details: (props) => (
        <>
          <DrawerTitle>
            {strings.catalog.entities.common.details.title()}
          </DrawerTitle>
          <DrawerItem
            name={strings.catalog.entities.common.details.props.uid()}
          >
            {props.entity.metadata.uid || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.common.details.props.dateCreated()}
          >
            {formatDate(props.entity.spec.createdAt) || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.credential.details.props.provider()}
          >
            {props.entity.spec.provider || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.credential.details.props.region()}
          >
            {props.entity.spec.region || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.common.details.props.serverStatus()}
          >
            {strings.catalog.entities.credential.details.info.status(
              props.entity.spec.valid
            )}
          </DrawerItem>
          <DrawerTitle>
            {strings.catalog.entities.common.details.props.lensExtension()}
          </DrawerTitle>
          <DrawerItem
            name={strings.catalog.entities.common.details.props.lastSync()}
          >
            {formatDate(props.entity.metadata.syncedAt)}
          </DrawerItem>
        </>
      ),
    },
  },
  {
    kind: ProxyEntity.kind,
    apiVersions: [ProxyEntity.apiVersion],
    components: {
      Details: (props) => (
        <>
          <DrawerTitle>
            {strings.catalog.entities.common.details.title()}
          </DrawerTitle>
          <DrawerItem
            name={strings.catalog.entities.common.details.props.uid()}
          >
            {props.entity.metadata.uid || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.common.details.props.dateCreated()}
          >
            {formatDate(props.entity.spec.createdAt) || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.proxy.details.props.region()}
          >
            {props.entity.spec.region || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.proxy.details.props.httpProxy()}
          >
            {props.entity.spec.httpProxy || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.proxy.details.props.httpsProxy()}
          >
            {props.entity.spec.httpsProxy || unknownValue()}
          </DrawerItem>
          <DrawerTitle>
            {strings.catalog.entities.common.details.props.lensExtension()}
          </DrawerTitle>
          <DrawerItem
            name={strings.catalog.entities.common.details.props.lastSync()}
          >
            {formatDate(props.entity.metadata.syncedAt)}
          </DrawerItem>
        </>
      ),
    },
  },
  {
    kind: LicenseEntity.kind,
    apiVersions: [LicenseEntity.apiVersion],
    components: {
      Details: (props) => (
        <>
          <DrawerTitle>
            {strings.catalog.entities.common.details.title()}
          </DrawerTitle>
          <DrawerItem
            name={strings.catalog.entities.common.details.props.uid()}
          >
            {props.entity.metadata.uid || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.common.details.props.dateCreated()}
          >
            {formatDate(props.entity.spec.createdAt) || unknownValue()}
          </DrawerItem>
          <DrawerTitle>
            {strings.catalog.entities.common.details.props.lensExtension()}
          </DrawerTitle>
          <DrawerItem
            name={strings.catalog.entities.common.details.props.lastSync()}
          >
            {formatDate(props.entity.metadata.syncedAt)}
          </DrawerItem>
        </>
      ),
    },
  },
];
