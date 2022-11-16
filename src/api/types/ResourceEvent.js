import { merge } from 'lodash';
import * as rtv from 'rtvjs';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { NamedResource, namedResourceTs } from './NamedResource';
import { apiEventTypes } from '../apiConstants';
import { logValue } from '../../util/logger';

/**
 * Typeset for an MCC API resource event (an event for any type of resource).
 */
export const resourceEventTs = mergeRtvShapes({}, namedResourceTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Credential` class instance

  // NOTE: event objects do not have a `kind` property

  involvedObject: {
    kind: rtv.STRING, // e.g. 'Cluster'
    uid: [rtv.OPTIONAL, rtv.STRING], // UID of the resource to which the event pertains (if available)
    name: rtv.STRING, // name of the resource
    namespace: rtv.STRING, // namespace of the resource
  },

  type: [rtv.STRING, { oneOf: Object.values(apiEventTypes) }], // e.g. 'Normal' or 'Warning'
  reason: rtv.STRING, // this is a code, e.g. 'ClusterSwarmBecameReady', not a phrase/sentence
  message: rtv.STRING, // full sentence describing the event's details
  source: {
    component: rtv.STRING, // e.g. 'openstack-controller'
  },

  count: rtv.SAFE_INT, // how many times this exact event has been reported
  lastTimestamp: rtv.STRING, // ISO8601, most recent occurrence time
});

/**
 * Event for any type of MCC API namespaced resource.
 * @class ResourceEvent
 */
export class ResourceEvent extends NamedResource {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.data Raw data payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {Cloud} params.cloud Reference to the Cloud used to get the data.
   * @param {rtv.Typeset} params.typeset Typeset for verifying the data.
   */
  constructor({ data, namespace, cloud, typeset = resourceEventTs }) {
    super({ data, cloud, namespace, typeset });

    /**
     * @readonly
     * @member {string} type Event type. One of the `apiEventTypes` enum values.
     */
    Object.defineProperty(this, 'type', {
      enumerable: true,
      get() {
        return data.type;
      },
    });

    /**
     * @readonly
     * @member {Date} lastDate Timestamp for the most recent time the event was reported.
     */
    Object.defineProperty(this, 'lastDate', {
      enumerable: true,
      get() {
        return new Date(data.lastTimestamp);
      },
    });

    /**
     * @readonly
     * @member {number} count Number of times this event has been reported thus far.
     */
    Object.defineProperty(this, 'count', {
      enumerable: true,
      get() {
        return data.count;
      },
    });

    /**
     * @readonly
     * @member {string} sourceComponent The component that emitted the event.
     */
    Object.defineProperty(this, 'sourceComponent', {
      enumerable: true,
      get() {
        return data.source.component;
      },
    });

    /**
     * @readonly
     * @member {string} targetKind API kind of the resource to which this event pertains.
     *  Will be one of the `apiKinds` enum values.
     */
    Object.defineProperty(this, 'targetKind', {
      enumerable: true,
      get() {
        return data.involvedObject.kind;
      },
    });

    /**
     * @readonly
     * @member {string|null} targetUid UID of the resource to which this event pertains,
     *  if available.
     */
    Object.defineProperty(this, 'targetUid', {
      enumerable: true,
      get() {
        return data.involvedObject.uid || null;
      },
    });

    /**
     * @readonly
     * @member {string} targetName Name of the resource to which this event pertains.
     */
    Object.defineProperty(this, 'targetName', {
      enumerable: true,
      get() {
        return data.involvedObject.name;
      },
    });

    /**
     * @readonly
     * @member {string} reason Event reason code, e.g. 'ClusterSwarmBecameReady'.
     */
    Object.defineProperty(this, 'reason', {
      enumerable: true,
      get() {
        return data.reason;
      },
    });

    /**
     * @readonly
     * @member {string} message Event details.
     */
    Object.defineProperty(this, 'message', {
      enumerable: true,
      get() {
        return data.message;
      },
    });
  }

  /**
   * Converts this API Object into a Catalog Entity Model.
   * @returns {{ metadata: Object, spec: Object, status: Object }} Catalog Entity Model
   *  (use to create new Catalog Entity).
   */
  toModel() {
    const model = super.toModel();

    return merge({}, model, {
      spec: {
        type: this.type,
        lastTimeAt: this.lastDate.toISOString(),
        count: this.count,
        sourceComponent: this.sourceComponent,
        targetKind: this.targetKind,
        targetUid: this.targetUid, // NOTE: could be `null` if not available
        targetName: this.targetName,
        reason: this.reason,
        message: this.message,
      },
      status: {
        phase: 'available',
      },
    });
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, type: ${logValue(
      this.type
    )}, last: ${logValue(this.lastDate)}, count: ${logValue(
      this.count
    )}, reason: ${logValue(this.reason)}, targetKind: ${logValue(
      this.targetKind
    )}, targetName: ${logValue(this.targetName)}`;

    if (Object.getPrototypeOf(this).constructor === ResourceEvent) {
      return `{ResourceEvent ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
