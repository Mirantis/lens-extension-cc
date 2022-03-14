//
// MCC API constants
//

import { pick } from 'lodash';

/**
 * Map of API resource type to name/endpoint used in Kube API calls.
 * @type {{ [index: string], string }}
 */
export const apiResourceTypes = Object.freeze({
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
 * Map of credential entity type to name/endpoint used in Kube API calls.
 * @type {{ [index: string], string }}
 */
export const apiCredentialTypes = Object.freeze(
  pick(apiResourceTypes, [
    // NOTE: these are KEYS from the apiResourceTypes map
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
  AWS_CREDENTIAL: 'AWSCredential',
  AZURE_CREDENTIAL: 'AzureCredential',
  BYO_CREDENTIAL: 'BYOCredential',
  EQUINIX_CREDENTIAL: 'EquinixMetalCredential',
  METAL_CREDENTIAL: 'Secret', // TODO: not sure of the actual kind in kube spec, need MCC+BM env
  OPENSTACK_CREDENTIAL: 'OpenStackCredential',
  VSPHERE_CREDENTIAL: 'VsphereCredential',
  RHEL_LICENSE: 'RHELLicense',
  PROXY: 'Proxy',
});

/**
 * Map of credential API kind to kube spec `kind` property value in API data objects.
 * @type {{ [index: string], string }}
 */
export const apiCredentialKinds = Object.freeze(
  pick(apiKinds, [
    // NOTE: these are KEYS from the apiResourceTypes map
    'AWS_CREDENTIAL',
    'AZURE_CREDENTIAL',
    'BYO_CREDENTIAL',
    'EQUINIX_CREDENTIAL',
    'METAL_CREDENTIAL',
    'OPENSTACK_CREDENTIAL',
    'VSPHERE_CREDENTIAL',
  ])
);

/**
 * Map of credential API kind to provider (set as its 'kaas.mirantis.com/provider' label's value)
 *  as used in the API.
 * @type {{ [index: string], string }}
 */
export const apiCredentialProviders = Object.freeze({
  AWS_CREDENTIAL: 'aws',
  AZURE_CREDENTIAL: 'azure',
  BYO_CREDENTIAL: 'byo',
  EQUINIX_CREDENTIAL: 'equinixmetal',
  // TODO: there may be one more kind here for BM credentials (i.e. secrets)
  //  but we first need to test this in an MCC+BM env
  // METAL_CREDENTIAL: '',
  OPENSTACK_CREDENTIAL: 'openstack',
  VSPHERE_CREDENTIAL: 'vsphere',
});
