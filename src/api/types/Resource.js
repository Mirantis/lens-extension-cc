import * as rtv from 'rtvjs';
import * as consts from '../../constants';
import { Cloud } from '../../common/Cloud';
import { logString } from '../../util/logger';

/**
 * Typeset for a basic MCC API Object.
 */
export const resourceTs = {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Credential` class instance

  // NOTE: not all API objects have a `kind` property (e.g. namespaces do not)
  kind: [rtv.OPTIONAL, rtv.STRING],

  metadata: {
    uid: rtv.STRING,
    name: rtv.STRING,
    creationTimestamp: rtv.STRING, // ISO8601 timestamp
    deletionTimestamp: [rtv.OPTIONAL, rtv.STRING], // ISO8601 timestamp; only exists if being deleted
  },
};

/**
 * Generic Kubernetes API resource. This is essentially a standard kube object spec with some
 *  MCC-specific extensions.
 * @class Resource
 */
export class Resource {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.data Raw data payload from the API.
   * @param {Cloud} params.cloud Reference to the Cloud used to get the data.
   * @param {rtv.Typeset} params.typeset Typeset for verifying the data.
   */
  constructor({ data, cloud, typeset = null }) {
    DEV_ENV &&
      rtv.verify(
        { data, cloud },
        {
          data: typeset,
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
    Object.defineProperty(this, 'kind', {
      enumerable: true,
      get() {
        return data.kind;
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
    Object.defineProperty(this, 'createdDate', {
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
   * Converts this API Object into a Catalog Entity Model.
   * @returns {{ metadata: Object, spec: Object, status: Object }} Catalog Entity Model (use to create new Catalog Entity).
   */
  toModel() {
    return {
      metadata: {
        uid: this.uid,
        name: this.name,
        source: consts.catalog.source,
        description: null,
        labels: {},
        cloudUrl: this.cloud.cloudUrl,
        kind: this.kind,
      },
      spec: {
        createdAt: this.createdDate.toISOString(),
      },
      status: {},
    };
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `name: ${logString(this.name)}, uid: ${logString(
      this.uid
    )}, kind: ${logString(this.kind)}, cloudUrl=${logString(
      this.cloud?.cloudUrl
    )}`;

    if (Object.getPrototypeOf(this).constructor === Resource) {
      return `{Resource ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
