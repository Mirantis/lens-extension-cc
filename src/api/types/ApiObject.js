import * as rtv from 'rtvjs';

/**
 * Typeset for a basic MCC API Object.
 */
export const apiObjectTs = {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Credential` class instance

  metadata: {
    uid: rtv.STRING,
    name: rtv.STRING,
    creationTimestamp: rtv.STRING, // ISO8601 timestamp
    deletionTimestamp: [rtv.OPTIONAL, rtv.STRING], // ISO8601 timestamp; only exists if being deleted
  },
};

/**
 * MCC generic API object. This is essentially a standard kube object spec with some
 *  MCC-specific extensions.
 * @class ApiObject
 * @param {Object} data Raw cluster data payload from the API.
 */
export class ApiObject {
  constructor(data) {
    DEV_ENV && rtv.verify({ data }, { data: apiObjectTs });

    /** @member {string} */
    Object.defineProperty(this, 'id', {
      enumerable: true,
      get() {
        return data.metadata.uid;
      },
    });

    /** @member {string} */
    Object.defineProperty(this, 'name', {
      enumerable: true,
      get() {
        return data.metadata.name;
      },
    });

    /** @member {Date} */
    Object.defineProperty(this, 'creationDate', {
      enumerable: true,
      get() {
        return new Date(data.metadata.creationTimestamp);
      },
    });

    /** @member {boolean|null} */
    Object.defineProperty(this, 'deleteInProgress', {
      enumerable: true,
      get() {
        return !!data.metadata.deletionTimestamp;
      },
    });
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `name: "${this.name}", id: "${this.id}"`;

    if (Object.getPrototypeOf(this).constructor === ApiObject) {
      return `{ApiObject ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
