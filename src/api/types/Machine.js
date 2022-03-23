import * as rtv from 'rtvjs';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { apiKinds, apiLabels } from '../apiConstants';
import { resourceTs } from './Resource';
import { Node } from './Node';
import { logValue } from '../../util/logger';

/**
 * Typeset for an MCC Machine API resource.
 */
export const machineTs = mergeRtvShapes({}, resourceTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Credential` class instance

  kind: [rtv.STRING, { oneOf: apiKinds.MACHINE }],
  metadata: {
    labels: [
      rtv.OPTIONAL,
      {
        [apiLabels.CLUSTER_NAME]: rtv.STRING,
        [apiLabels.CLUSTER_CONTROLLER]: [rtv.OPTIONAL, rtv.STRING], // only set if this is a master node
        [apiLabels.KAAS_PROVIDER]: [rtv.OPTIONAL, rtv.STRING],
        [apiLabels.KAAS_REGION]: [rtv.OPTIONAL, rtv.STRING],
      },
    ],
  },
  status: {
    providerStatus: {
      // readiness conditions
      conditions: [
        [
          {
            message: rtv.STRING, // ready message if `ready=true` or error message if `ready=false`
            ready: rtv.BOOLEAN, // true if component is ready (NOTE: false if maintenance mode is active)
            type: rtv.STRING, // component name, e.g. 'Kubelet', 'Swarm, 'Maintenance', etc.
          },
        ],
      ],

      // overall readiness: true if all `conditions[*].ready` are true
      ready: rtv.BOOLEAN,

      // NOTE: machines do have a `status: string` property, e.g. 'Pending', 'Ready', etc.
      //  (not sure what all words are possible), but not sure if this property is reliable
      //  (e.g. it can actually be "Ready" when there are still unmet `conditions`, ones that
      //  have `ready=false`, which seems contradictory)
      // status: rtv.STRING,
    },
  },
});

/**
 * MCC machine API resource.
 * @class Machine
 */
export class Machine extends Node {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.data Raw data payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {Cloud} params.cloud Reference to the Cloud used to get the data.
   */
  constructor({ data, namespace, cloud }) {
    super({ data, cloud, namespace, typeset: machineTs });

    /**
     * @readonly
     * @member {string} clusterName
     */
    Object.defineProperty(this, 'clusterName', {
      enumerable: true,
      get() {
        return data.metadata.labels?.[apiLabels.CLUSTER_NAME] || null;
      },
    });

    /**
     * @readonly
     * @member {boolean} isController True if this Machine is a master node.
     */
    Object.defineProperty(this, 'isController', {
      enumerable: true,
      get() {
        return !!data.metadata.labels?.[apiLabels.CLUSTER_CONTROLLER];
      },
    });
  }

  // NOTE: we don't have toModel() and toEntity() because we don't show Machines in
  //  the Catalog at the moment (so we don't have a MachineEntity class for them)

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, namespace: ${logValue(
      this.namespace.name
    )}`;

    if (Object.getPrototypeOf(this).constructor === Machine) {
      return `{Machine ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
