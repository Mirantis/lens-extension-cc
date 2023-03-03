import * as rtv from 'rtvjs';
import * as consts from '../../constants';
import { timestampTs } from '../apiTypesets';
import { logValue } from '../../util/logger';

// NOTE: ideally, we'd import `DataCloud` here, but doing so results in a circular dependency
import { Cloud } from '../../common/Cloud';

/**
 * Typeset for a basic MCC API Object.
 */
export const resourceTs = {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Resource` class instance

  // NOTE: not all API objects have a `kind` property (e.g. namespaces and events do not)
  kind: [rtv.OPTIONAL, rtv.STRING],

  metadata: {
    uid: rtv.STRING,
    name: rtv.STRING,
    resourceVersion: rtv.STRING,
    creationTimestamp: timestampTs, // ISO8601 timestamp
    deletionTimestamp: [rtv.OPTIONAL, ...timestampTs], // ISO8601 timestamp; only exists if being deleted
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
   * @param {Object} params.kube Raw kube object payload from the API.
   * @param {DataCloud} params.dataCloud Reference to the DataCloud used to get the data.
   * @param {rtv.Typeset} params.typeset Typeset for verifying the data.
   */
  constructor({ kube, dataCloud, typeset = null }) {
    DEV_ENV &&
      rtv.verify(
        { kube, dataCloud },
        {
          // if `typeset` was specified, `null` here will cause `verify()` to fail, which is good
          //  since `typeset` should be considered required
          kube: typeset,

          // NOTE: ideally, we'd check `dataCloud` directly as an instance of `DataCloud`
          //  but we can't import the `DataCloud` class due to a circular dependency; so
          //  the next best thing is to check that the object has a `cloud` property, which
          //  is unique to a `DataCloud` instance
          dataCloud: {
            cloud: [rtv.CLASS_OBJECT, { ctor: Cloud }],
          },
        }
      );

    const _syncedDate = new Date(); // any time a Resource is created, it's because we're syncing it
    const _createdDate = new Date(kube.metadata.creationTimestamp);

    /**
     * @readonly
     * @member {DataCloud} dataCloud
     */
    Object.defineProperty(this, 'dataCloud', {
      enumerable: true,
      get() {
        return dataCloud;
      },
    });

    // convenience getter
    /**
     * @readonly
     * @member {Cloud} cloud
     */
    Object.defineProperty(this, 'cloud', {
      enumerable: true,
      get() {
        return dataCloud.cloud;
      },
    });

    /**
     * @readonly
     * @member {string} uid
     */
    Object.defineProperty(this, 'uid', {
      enumerable: true,
      get() {
        return kube.metadata.uid;
      },
    });

    /**
     * @readonly
     * @member {string|null} kind One of the known API kinds in the `apiConstants.apiKinds` enum.
     *  `null` if the Resource doesn't have a kind (e.g. in the case of a Namespace or ResourceEvent).
     */
    Object.defineProperty(this, 'kind', {
      enumerable: true,
      get() {
        return kube.kind || null;
      },
    });

    /**
     * @readonly
     * @member {string} name
     */
    Object.defineProperty(this, 'name', {
      enumerable: true,
      get() {
        return kube.metadata.name;
      },
    });

    /**
     * @readonly
     * Identifies a specific version of this resource in the Kube API. This opaque
     *  string value can be used to detect when the resource has changed, so it
     *  essentially reprents a type of hash of the resource's values/state.
     * @member {string} resourceVersion
     * @see https://kubernetes.io/docs/reference/using-api/api-concepts/#efficient-detection-of-changes
     */
    Object.defineProperty(this, 'resourceVersion', {
      enumerable: true,
      get() {
        return kube.metadata.resourceVersion;
      },
    });

    /**
     * @readonly
     * @member {string} cacheVersion
     */
    Object.defineProperty(this, 'cacheVersion', {
      enumerable: true,
      get() {
        return ENTITY_CACHE_VERSION; // injected by Webpack
      },
    });

    /**
     * @readonly
     * @member {Date} createdDate
     */
    Object.defineProperty(this, 'createdDate', {
      enumerable: true,
      get() {
        return _createdDate;
      },
    });

    /**
     * @readonly
     * @member {Date} syncedDate
     */
    Object.defineProperty(this, 'syncedDate', {
      enumerable: true,
      get() {
        return _syncedDate;
      },
    });

    /**
     * @readonly
     * @member {boolean|null} deleteInProgress
     */
    Object.defineProperty(this, 'deleteInProgress', {
      enumerable: true,
      get() {
        return !!kube.metadata.deletionTimestamp;
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
        labels: {}, // NOTE: these are not necessarily to be the same as any `metadata.labels` we may have on the `data`
        cloudUrl: this.dataCloud.cloudUrl,
        cloudRelease: this.dataCloud.release
          ? {
              active: this.dataCloud.release.active,
              version: this.dataCloud.release.version,
            }
          : null,
        kind: this.kind, // NOTE: could be `null` if unknown
        resourceVersion: this.resourceVersion,
        cacheVersion: this.cacheVersion,
        syncedAt: this.syncedDate.toISOString(),
      },
      spec: {
        createdAt: this.createdDate.toISOString(),
      },
      status: {},
    };
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `name: ${logValue(this.name)}, kind: ${logValue(
      this.kind
    )}, uid: ${logValue(this.uid)}, revision: ${
      this.resourceVersion
    }, cloudUrl: ${logValue(this.dataCloud.cloudUrl)}`;

    if (Object.getPrototypeOf(this).constructor === Resource) {
      return `{Resource ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }

  /**
   * @returns {string} A __short(er)__ (less verbose than `toString()`) string representation
   *  of this instance for logging/debugging.
   */
  toShortString() {
    return `{Resource ${this.name}/#${this.uid}/@${this.resourceVersion}/@@${this.cacheVersion}}`;
  }
}
