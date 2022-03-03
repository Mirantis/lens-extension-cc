//
// MCC API constants
//

import { pick } from 'lodash';

/**
 * Map of API entity type to name/endpoint used in MCC API calls.
 * @type {{ [index: string], string }}
 */
export const apiEntities = Object.freeze({
  CLUSTER: 'clusters',
  MACHINE: 'machines',
  PUBLIC_KEY: 'publickeys', // "SSH keys"
  NAMESPACE: 'namespaces',
  OPENSTACK_CREDENTIAL: 'openstackcredentials',
  AWS_CREDENTIAL: 'awscredentials',
  EQUINIX_CREDENTIAL: 'equinixmetalcredentials',
  VSPHERE_CREDENTIAL: 'vspherecredentials',
  AZURE_CREDENTIAL: 'azurecredentials',
  BYO_CREDENTIAL: 'byocredentials',
  METAL_CREDENTIAL: 'secrets',
  EVENT: 'events',
  CLUSTER_RELEASE: 'clusterreleases',
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
 * Map of credential entity type to name/endpoint used in MCC API calls.
 * @type {{ [index: string], string }}
 */
export const apiCredentialEntities = Object.freeze(
  pick(apiEntities, [
    // NOTE: these are KEYS from the apiEntities map
    'OPENSTACK_CREDENTIAL',
    'AWS_CREDENTIAL',
    'EQUINIX_CREDENTIAL',
    'VSPHERE_CREDENTIAL',
    'AZURE_CREDENTIAL',
    'BYO_CREDENTIAL',
    'METAL_CREDENTIAL',
  ])
);

/**
 * Map of API kind to kube spec `kind` property value in API data objects.
 * @type {{ [index: string], string }}
 */
export const apiKinds = Object.freeze({
  NAMESPACE: 'Namespace',
  CLUSTER: 'Cluster',
  PUBLIC_KEY: 'PublicKey',
  OPENSTACK_CREDENTIAL: 'OpenStackCredential',
  AWS_CREDENTIAL: 'AWSCredential',
  EQUINIX_CREDENTIAL: 'EquinixMetalCredential',
  VSPHERE_CREDENTIAL: 'VsphereCredential',
  AZURE_CREDENTIAL: 'AzureCredential',
  BYO_CREDENTIAL: 'BYOCredential',
  METAL_CREDENTIAL: 'Secret', // TODO: not sure of the actual kind in kube spec
  RHEL_LICENSE: 'RHELLicense',
  PROXY: 'Proxy',
});

/**
 * Map of credential API kind to kube spec `kind` property value in API data objects.
 * @type {{ [index: string], string }}
 */
export const apiCredentialKinds = Object.freeze(
  pick(apiKinds, [
    // NOTE: these are KEYS from the apiEntities map
    'OPENSTACK_CREDENTIAL',
    'AWS_CREDENTIAL',
    'EQUINIX_CREDENTIAL',
    'VSPHERE_CREDENTIAL',
    'AZURE_CREDENTIAL',
    'BYO_CREDENTIAL',
    'METAL_CREDENTIAL',
  ])
);
