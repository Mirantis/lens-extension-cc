import * as rtv from 'rtvjs';
import { get, merge } from 'lodash';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { ApiObject, apiObjectTs } from './ApiObject';
import { Namespace } from './Namespace';
import { credentialEntityPhases } from '../../catalog/CredentialEntity';

/**
 * Map of name to credential kind values as used by the API in a Credential object
 *  payload.
 */
export const credentialKinds = Object.freeze({
  OPENSTACK: 'OpenStackCredential',
  VSPHERE: 'VsphereCredential',
  EQUINIX: 'EquinixMetalCredential',
  AZURE: 'AzureCredential',
  AWS: 'AWSCredential',
  // TODO: there may be one more kind here for BM credentials (i.e. secrets) but we
  //  first need to test this in an MCC+BM env
});

/**
 * Typeset for an MCC Credential object.
 */
export const apiCredentialTs = mergeRtvShapes({}, apiObjectTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Credential` class instance

  kind: [rtv.STRING, { oneOf: Object.values(credentialKinds) }],
  metadata: {
    labels: [
      rtv.OPTIONAL,
      {
        'kaas.mirantis.com/provider': [rtv.OPTIONAL, rtv.STRING],
        'kaas.mirantis.com/region': [rtv.OPTIONAL, rtv.STRING],
      },
    ],
  },
  status: {
    valid: rtv.BOOLEAN,
  },
});

export class Credential extends ApiObject {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.data Raw data payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {Cloud} params.cloud Reference to the Cloud used to get the data.
   */
  constructor({ data, namespace, cloud }) {
    super({ data, cloud });

    // now we have check only for openStack. It's hard to predict other types
    DEV_ENV &&
      rtv.verify(
        { data, namespace },
        {
          data: apiCredentialTs,
          namespace: [rtv.CLASS_OBJECT, { ctor: Namespace }],
        }
      );

    /** @member {string} kind  */
    Object.defineProperty(this, 'kind', {
      enumerable: true,
      get() {
        return data.kind;
      },
    });

    /** @member {Namespace} namespace */
    Object.defineProperty(this, 'namespace', {
      enumerable: true,
      get() {
        return namespace;
      },
    });

    /** @member {string} region */
    Object.defineProperty(this, 'region', {
      enumerable: true,
      get() {
        return get(data.metadata, 'labels["kaas.mirantis.com/region"]', null);
      },
    });

    /** @member {string} provider */
    Object.defineProperty(this, 'provider', {
      enumerable: true,
      get() {
        return get(data.metadata, 'labels["kaas.mirantis.com/provider"]', null);
      },
    });

    /** @member {boolean} valid */
    Object.defineProperty(this, 'valid', {
      enumerable: true,
      get() {
        return !!data.status.valid;
      },
    });
  }

  /**
   * Converts this API Object into a Catalog Entity.
   * @returns {Object} Entity object.
   * @override
   */
  toEntity() {
    const entity = super.toEntity();

    return merge({}, entity, {
      metadata: {
        labels: {
          managementCluster: this.cloud.name,
          project: this.namespace.name,
        },
      },
      spec: {
        provider: this.provider,
        region: this.region,
        valid: this.valid,
      },
      status: {
        phase: credentialEntityPhases.AVAILABLE,
      },
    });
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, kind: "${this.kind}", namespace: "${
      this.namespace.name
    }", valid: ${this.valid}`;

    if (Object.getPrototypeOf(this).constructor === Credential) {
      return `{Credential ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
