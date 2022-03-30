//
// Represents a Cloud's config.js JSON metadata
//

import * as rtv from 'rtvjs';
import { apiResourceTypes } from '../api/apiConstants';
import { logValue } from '../util/logger';

/** Typeset for the config.js object. */
export const cloudConfigTs = {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Credential` class instance

  // NOTE: if a component doesn't exist (`undefined`), it should be treated as __enabled__
  disabledComponents: {
    aws: [rtv.OPTIONAL, rtv.BOOLEAN],
    azure: [rtv.OPTIONAL, rtv.BOOLEAN],
    baremetal: [rtv.OPTIONAL, rtv.BOOLEAN],
    byo: [rtv.OPTIONAL, rtv.BOOLEAN],
    ceph: [rtv.OPTIONAL, rtv.BOOLEAN],
    equinixmetal: [rtv.OPTIONAL, rtv.BOOLEAN],
    openstack: [rtv.OPTIONAL, rtv.BOOLEAN],
    vsphere: [rtv.OPTIONAL, rtv.BOOLEAN],
    proxy: [rtv.OPTIONAL, rtv.BOOLEAN],
  },

  ignoredNamespaces: [[rtv.STRING]],
  keycloakLogin: [rtv.OPTIONAL, rtv.BOOLEAN], // true if SSO-enabled

  // only defined if `keycloakLogin=true`
  keycloak: [
    rtv.OPTIONAL,
    {
      'client-id': [rtv.OPTIONAL, rtv.STRING], // OAuth client ID
      'idp-issuer-url': [rtv.OPTIONAL, rtv.STRING], // path from base URL to Keycloak service
    },
  ],
};

/**
 * Represents a config.js object from a mgmt cluster.
 * @class CloudConfig
 */
export class CloudConfig {
  /**
   * Constructor
   * @param {string} cloudUrl URL of the mgmt cluster.
   * @param {Object} config JSON config.js object from the mgmt cluster.
   */
  constructor(cloudUrl, config) {
    DEV_ENV &&
      rtv.verify(
        { cloudUrl, config },
        {
          cloudUrl: rtv.STRING,
          config: cloudConfigTs,
        }
      );

    /** @member {string} cloudUrl URL of the mgmt cluster this config belongs to. */
    Object.defineProperty(this, 'cloudUrl', {
      enumerable: true,
      writable: false,
      value: cloudUrl,
    });

    // proxy everything we get via class properties of same name to maintain
    //  the same interface
    Object.keys(config).forEach((key) => {
      Object.defineProperty(this, key, {
        enumerable: true,
        writable: false,
        value: config[key],
      });
    });
  }

  /** @member {boolean} ssoEnabled True if Keycloak/SSO is supported; false otherwise. */
  get ssoEnabled() {
    return !!this.keycloakLogin;
  }

  /**
   * Determines if a given API resource is available in this Cloud.
   * @param {string} resourceType API resource type. Enum value from `apiResourceTypes`.
   * @returns {boolean} True if available; false if not.
   */
  isResourceAvailable(resourceType) {
    const isAvailable = (feature) =>
      this.disabledComponents[feature] === undefined ||
      !this.disabledComponents[feature];

    switch (resourceType) {
      case apiResourceTypes.CLUSTER: // fall-through
      case apiResourceTypes.MACHINE: // fall-through
      case apiResourceTypes.PUBLIC_KEY: // fall-through
      case apiResourceTypes.NAMESPACE: // fall-through
      case apiResourceTypes.EVENT: // fall-through
      case apiResourceTypes.CLUSTER_RELEASE: // fall-through
      case apiResourceTypes.KAAS_RELEASE: // fall-through
      case apiResourceTypes.AUTHORIZATION: // fall-through
      case apiResourceTypes.VSPHERE_CREDENTIAL:
        return true; // always enabled

      case apiResourceTypes.AWS_CREDENTIAL:
      case apiResourceTypes.AWS_RESOURCE:
        return isAvailable('aws');

      case apiResourceTypes.EQUINIX_CREDENTIAL:
        return isAvailable('equinixmetal');

      case apiResourceTypes.PROXY:
        return (
          isAvailable('proxy') &&
          (isAvailable('openstack') || isAvailable('vsphere'))
        );

      case apiResourceTypes.AZURE_CREDENTIAL:
        return isAvailable('azure');

      case apiResourceTypes.BYO_CREDENTIAL:
        return isAvailable('byo');

      case apiResourceTypes.METAL_CREDENTIAL:
      case apiResourceTypes.METAL_HOST:
        return isAvailable('baremetal');

      case apiResourceTypes.RHEL_LICENSE:
        return isAvailable('vsphere');

      case apiResourceTypes.OPENSTACK_CREDENTIAL: // fall-through
      case apiResourceTypes.OPENSTACK_RESOURCE: // fall-through
        return isAvailable('openstack');

      case apiResourceTypes.CEPH_CLUSTER:
        return isAvailable('ceph');

      default:
        throw new Error(`Unknown API resource type ${logValue(resourceType)}`);
    }
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `ssoEnabled: ${
      this.ssoEnabled
    }, bmAvailable: ${this.isResourceAvailable(
      apiResourceTypes.METAL_HOST
    )}, cloudUrl: ${logValue(this.cloudUrl)}`;

    return `{CloudConfig ${propStr}}`;
  }
}
