import * as rtv from 'rtvjs';
import { merge } from 'lodash';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { NamedResource, namedResourceTs } from './NamedResource';
import { entityLabels } from '../../catalog/catalogEntities';
import { SshKeyEntity, sshKeyEntityPhases } from '../../catalog/SshKeyEntity';
import { apiKinds } from '../apiConstants';

/**
 * Typeset for an MCC SSH Key API resource.
 */
export const sshKeyTs = mergeRtvShapes({}, namedResourceTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create an `SshKey` class instance

  kind: [rtv.STRING, { oneOf: apiKinds.PUBLIC_KEY }],
  spec: {
    publicKey: rtv.STRING,
  },
});

/**
 * MCC ssh key API resource.
 * @class SshKey
 */
export class SshKey extends NamedResource {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.kube Raw kube object payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {DataCloud} params.dataCloud Reference to the DataCloud used to get the data.
   */
  constructor({ kube, namespace, dataCloud }) {
    super({ kube, namespace, dataCloud, typeset: sshKeyTs });

    /** @member {string} publicKey */
    Object.defineProperty(this, 'publicKey', {
      enumerable: true,
      get() {
        return kube.spec.publicKey;
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
    const model = super.toModel();

    return merge({}, model, {
      metadata: {
        labels: {
          [entityLabels.CLOUD]: this.dataCloud.name,
          [entityLabels.NAMESPACE]: this.namespace.name,
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
    const propStr = `${super.toString()}, publicKey: "${
      // NOTE: some public keys can have newlines at the end for some reason
      this.publicKey.slice(0, 15).replaceAll('\n', '')
    }..${
      // NOTE: some public keys can have newlines at the end for some reason
      this.publicKey.slice(-15).replaceAll('\n', '')
    }"`;

    if (Object.getPrototypeOf(this).constructor === SshKey) {
      return `{SshKey ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
