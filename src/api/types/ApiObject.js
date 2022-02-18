import * as rtv from 'rtvjs';
import * as consts from '../../constants';
import { Cloud } from '../../common/Cloud';

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
 */
export class ApiObject {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.data Raw data payload from the API.
   * @param {Cloud} params.cloud Reference to the Cloud used to get the data.
   */
  constructor({ data, cloud }) {
    DEV_ENV &&
      rtv.verify(
        { data, cloud },
        {
          data: apiObjectTs,
          cloud: [rtv.CLASS_OBJECT, { ctor: Cloud }],
        }
      );

    /** @member {Cloud} */
    Object.defineProperty(this, 'cloud', {
      enumerable: true,
      get() {
        return cloud;
      },
    });

    /** @member {string} */
    Object.defineProperty(this, 'uid', {
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

  /**
   * Converts this API Object into a Catalog Entity.
   * @returns {Object} Entity object.
   */
  toEntity() {
    return {
      metadata: {
        uid: this.uid,
        name: this.name,
        source: consts.catalog.source,
        description: null,
        labels: {},
        cloudUrl: this.cloud.cloudUrl,
        namespace: null, // required, but to be filled-in by extended classes
      },
      spec: {},
      status: {},
    };
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `name: "${this.name}", uid: "${this.uid}"`;

    if (Object.getPrototypeOf(this).constructor === ApiObject) {
      return `{ApiObject ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
