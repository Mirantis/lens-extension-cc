import * as rtv from 'rtvjs';
import { merge } from 'lodash';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { ApiObject, apiObjectTs } from './ApiObject';
import { Namespace } from './Namespace';
import { sshKeyEntityPhases } from '../../catalog/SshKeyEntity';

/**
 * Typeset for an MCC SSH Key object.
 */
export const apiSshKeyTs = mergeRtvShapes({}, apiObjectTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Credential` class instance

  kind: [rtv.STRING, { oneOf: 'PublicKey' }],
  spec: {
    publicKey: rtv.STRING,
  },
});

/**
 * MCC ssh key.
 * @class SshKey
 * @param {Object} data Raw cluster data payload from the API.
 * @param {Namespace} namespace Namespace to which this object belongs.
 */
export class SshKey extends ApiObject {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.data Raw data payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {Cloud} params.cloud Reference to the Cloud used to get the data.
   */
  constructor({ data, namespace, cloud }) {
    super({ data, cloud });

    DEV_ENV &&
      rtv.verify(
        { data, namespace },
        {
          data: apiSshKeyTs,
          namespace: [rtv.CLASS_OBJECT, { ctor: Namespace }],
        }
      );

    /** @member {Namespace} */
    Object.defineProperty(this, 'namespace', {
      enumerable: true,
      get() {
        return namespace;
      },
    });

    /** @member {string} */
    Object.defineProperty(this, 'kind', {
      enumerable: true,
      get() {
        return data.kind;
      },
    });

    /** @member {string} */
    Object.defineProperty(this, 'publicKey', {
      enumerable: true,
      get() {
        return data.spec.publicKey;
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
        publicKey: this.publicKey,
      },
      status: {
        phase: sshKeyEntityPhases.AVAILABLE,
      },
    });
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, kind: "${this.kind}", namespace: "${
      this.namespace.name
    }", publicKey: "${this.publicKey.slice(0, 15)}..${this.publicKey.slice(
      -15
    )}"`;

    if (Object.getPrototypeOf(this).constructor === SshKey) {
      return `{SshKey ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
