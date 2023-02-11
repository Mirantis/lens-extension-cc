//
// MCC API constants
//

import { pick } from 'lodash';

/**
 * Map of API resource type to name/endpoint used in Kube API calls.
 * @type {Record<string, string>}
 */
export const apiResourceTypes = Object.freeze({
  CLUSTER: 'clusters',
  CLUSTER_RELEASE: 'clusterreleases',
  CLUSTER_DEPLOYMENT_STATUS: 'clusterdeploymentstatuses',
  CLUSTER_UPGRADE_STATUS: 'clusterupgradestatuses',
  MACHINE: 'machines',
  MACHINE_DEPLOYMENT_STATUS: 'machinedeploymentstatuses',
  MACHINE_UPGRADE_STATUS: 'machineupgradestatuses',
  PUBLIC_KEY: 'publickeys', // "SSH keys"
  NAMESPACE: 'namespaces',
  OPENSTACK_CREDENTIAL: 'openstackcredentials',
  AWS_CREDENTIAL: 'awscredentials',
  EQUINIX_CREDENTIAL: 'equinixmetalcredentials',
  VSPHERE_CREDENTIAL: 'vspherecredentials',
  AZURE_CREDENTIAL: 'azurecredentials',
  BYO_CREDENTIAL: 'byocredentials',
  SECRET: 'secrets',
  EVENT: 'events',
  KAAS_RELEASE: 'kaasreleases',
  OPENSTACK_RESOURCE: 'openstackresources',
  AWS_RESOURCE: 'awsresources',
  AUTHORIZATION: 'authorizations',
  METAL_HOST: 'baremetalhosts',
  CEPH_CLUSTER: 'kaascephclusters',
  RHEL_LICENSE: 'rhellicenses',
  PROXY: 'proxies',
});

/**
 * Map of API credential type to name/endpoint used in Kube API calls.
 * @type {Record<string, string>}
 */
export const apiCredentialTypes = Object.freeze(
  pick(apiResourceTypes, [
    'OPENSTACK_CREDENTIAL',
    'AWS_CREDENTIAL',
    'EQUINIX_CREDENTIAL',
    'VSPHERE_CREDENTIAL',
    'AZURE_CREDENTIAL',
    'BYO_CREDENTIAL',
  ])
);

/**
 * Map of API update type to name/endpoint used in Kube API calls.
 * @type {Record<string, string>}
 */
export const apiUpdateTypes = Object.freeze(
  pick(apiResourceTypes, [
    'CLUSTER_DEPLOYMENT_STATUS',
    'CLUSTER_UPGRADE_STATUS',
    'MACHINE_DEPLOYMENT_STATUS',
    'MACHINE_UPGRADE_STATUS',
  ])
);

/**
 * Map of API kind to kube spec `kind` property value in API data objects.
 * @type {Record<string, string>}
 */
export const apiKinds = Object.freeze({
  NAMESPACE: 'Namespace',
  CLUSTER: 'Cluster',
  CLUSTER_DEPLOYMENT_STATUS: 'ClusterDeploymentStatus',
  CLUSTER_UPGRADE_STATUS: 'ClusterUpgradeStatus',
  MACHINE: 'Machine',
  MACHINE_DEPLOYMENT_STATUS: 'MachineDeploymentStatus',
  MACHINE_UPGRADE_STATUS: 'MachineUpgradeStatus',
  PUBLIC_KEY: 'PublicKey',
  AWS_CREDENTIAL: 'AWSCredential',
  AZURE_CREDENTIAL: 'AzureCredential',
  BYO_CREDENTIAL: 'BYOCredential',
  EQUINIX_CREDENTIAL: 'EquinixMetalCredential',
  OPENSTACK_CREDENTIAL: 'OpenStackCredential',
  VSPHERE_CREDENTIAL: 'VsphereCredential',
  RHEL_LICENSE: 'RHELLicense',
  PROXY: 'Proxy',
  EVENT: 'Event', // cluster events
});

/**
 * Map of credential API kind to kube spec `kind` property value in API data objects.
 * @type {Record<string, string>}
 */
export const apiCredentialKinds = Object.freeze(
  pick(apiKinds, [
    'AWS_CREDENTIAL',
    'AZURE_CREDENTIAL',
    'BYO_CREDENTIAL',
    'EQUINIX_CREDENTIAL',
    'OPENSTACK_CREDENTIAL',
    'VSPHERE_CREDENTIAL',
  ])
);

/**
 * Map of update API kind to kube spec `kind` property value in API data objects.
 * @type {Record<string, string>}
 */
export const apiUpdateKinds = Object.freeze(
  pick(apiKinds, [
    'CLUSTER_DEPLOYMENT_STATUS',
    'CLUSTER_UPGRADE_STATUS',
    'MACHINE_DEPLOYMENT_STATUS',
    'MACHINE_UPGRADE_STATUS',
  ])
);

/**
 * Map of credential API kind to provider (set as its 'kaas.mirantis.com/provider' label's value)
 *  as used in the API.
 * @type {Record<string, string>}
 */
export const apiCredentialProviders = Object.freeze({
  AWS_CREDENTIAL: 'aws',
  AZURE_CREDENTIAL: 'azure',
  BYO_CREDENTIAL: 'byo',
  EQUINIX_CREDENTIAL: 'equinixmetal',
  OPENSTACK_CREDENTIAL: 'openstack',
  VSPHERE_CREDENTIAL: 'vsphere',
});

/**
 * Map of API label to value.
 * @type {Record<string, string>}
 */
export const apiLabels = Object.freeze({
  KAAS_REGION: 'kaas.mirantis.com/region',
  KAAS_PROVIDER: 'kaas.mirantis.com/provider',
  CLUSTER_CONTROLLER: 'cluster.sigs.k8s.io/control-plane', // if a machine is a master (vs worker)
  CLUSTER_NAME: 'cluster.sigs.k8s.io/cluster-name', // machine's associated cluster
});

/**
 * Map of API namespace (status) phases to value.
 * @type {Record<string, string>}
 */
export const apiNamespacePhases = Object.freeze({
  ACTIVE: 'Active',
  TERMINATING: 'Terminating',
});

/**
 * Map of API resource event types.
 * @type {Record<string, string>}
 */
export const apiEventTypes = Object.freeze({
  NORMAL: 'Normal',
  WARNING: 'Warning',
});

/**
 * Map of (currently known, but could be more) API resource update statuses.
 * @type {Record<string, string>}
 */
export const apiUpdateStatuses = Object.freeze({
  SUCCESS: 'Success',
  IN_PROGRESS: 'In progress',
  NOT_STARTED: 'Not started',
  FAILED: 'Failed',

  // TODO[cluster-history]: use MCC v2.22 values
  // SUCCESS: 'Success',
  // IN_PROGRESS: 'InProgress',
  // NOT_STARTED: 'NotStarted',
  // FAILURE: 'Fail',
});

/**
 * Possible Cloud connection error types.
 * @type {Record<string, string>}
 */
export const apiCloudErrorTypes = Object.freeze({
  HOST_NOT_FOUND: 'HostNotFound',
  CERT_VERIFICATION: 'CertificateVerification',
});
