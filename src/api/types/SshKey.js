import * as rtv from 'rtvjs';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { ApiObject, apiObjectTs } from './ApiObject';
import { Namespace } from './Namespace';

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
  constructor(data, namespace) {
    super(data);

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
