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
