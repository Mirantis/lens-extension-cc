import * as rtv from 'rtvjs';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { apiKinds } from '../apiConstants';
import { ResourceEvent, resourceEventTs } from './ResourceEvent';

/**
 * Typeset for an MCC API cluster event resource.
 */
export const clusterEventTs = mergeRtvShapes({}, resourceEventTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `ClusterEvent` class instance

  involvedObject: {
    kind: [rtv.STRING, { oneOf: apiKinds.CLUSTER }],
  },
});

/**
 * MCC API cluster event.
 * @class ClusterEvent
 */
export class ClusterEvent extends ResourceEvent {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.kube Raw kube object payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {DataCloud} params.dataCloud Reference to the DataCloud used to get the data.
   */
  constructor({ kube, namespace, dataCloud }) {
    super({ kube, namespace, dataCloud, typeset: clusterEventTs });
  }

  // NOTE: we don't have toEntity() because we don't show ClusterEvents in the Catalog at
  //  the moment (so we don't have a ClusterEventEntity class for them either)

  /**
   * Converts this API Object into a Catalog Entity Model.
   * @returns {{ metadata: Object, spec: Object, status: Object }} Catalog Entity Model
   *  (use to create new Catalog Entity).
   */
  toModel() {
    // for now, there's nothing special we need to add
    return super.toModel();
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}`;

    if (Object.getPrototypeOf(this).constructor === ClusterEvent) {
      return `{ClusterEvent ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
