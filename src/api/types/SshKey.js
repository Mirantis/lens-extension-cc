import * as rtv from 'rtvjs';
import { merge } from 'lodash';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { ApiObject, apiObjectTs } from './ApiObject';
import { Namespace } from './Namespace';
import { SshKeyEntity, sshKeyEntityPhases } from '../../catalog/SshKeyEntity';
import { apiKinds } from '../apiConstants';

/**
 * Typeset for an MCC SSH Key object.
 */
export const apiSshKeyTs = mergeRtvShapes({}, apiObjectTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Credential` class instance

  kind: [rtv.STRING, { oneOf: apiKinds.PUBLIC_KEY }],
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
    super({ data, cloud, typeset: apiSshKeyTs });

    DEV_ENV &&
      rtv.verify(
        { namespace },
        {
          namespace: [rtv.CLASS_OBJECT, { ctor: Namespace }],
        }
      );

    /** @member {Namespace} namespace */
    Object.defineProperty(this, 'namespace', {
      enumerable: true,
      get() {
        return namespace;
      },
    });

    /** @member {string} publicKey */
    Object.defineProperty(this, 'publicKey', {
      enumerable: true,
      get() {
        return data.spec.publicKey;
      },
    });
  }

  /**
   * Converts this API Object into a Catalog Entity Model.
   * @returns {{ metadata: Object, spec: Object, status: Object }} Catalog Entity Model
   *  (use to create new Catalog Entity).
   * @override
   */
  toModel() {
    const entity = super.toModel();

    return merge({}, entity, {
      metadata: {
        namespace: this.namespace.name,
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

  /**
   * Converts this API Object into a Catalog Entity that can be inserted into a Catalog Source.
   * @returns {SshKeyEntity}
   */
  toEntity() {
    return new SshKeyEntity(this.toModel());
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, namespace: "${
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
