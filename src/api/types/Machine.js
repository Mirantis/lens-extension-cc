import * as rtv from 'rtvjs';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { apiKinds, apiLabels } from '../apiConstants';
import { nodeConditionTs } from '../apiTypesets';
import { Node, nodeTs } from './Node';
import { logger, logValue } from '../../util/logger';

/**
 * Typeset for an MCC Machine API resource.
 */
export const machineTs = mergeRtvShapes({}, nodeTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Machine` class instance

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
  spec: {
    providerSpec: {
      value: {
        // name of the associated license, if any
        rhelLicense: [rtv.OPTIONAL, rtv.STRING],
      },
    },
  },
  status: {
    providerStatus: {
      // readiness conditions
      conditions: [[nodeConditionTs]],

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
   * @param {Object} params.kube Raw kube object payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   *
   *  NOTE: The namespace is expected to already contain all known Licenses that
   *   this Machine might reference.
   *
   * @param {DataCloud} params.dataCloud Reference to the DataCloud used to get the data.
   */
  constructor({ kube, namespace, dataCloud }) {
    super({ kube, namespace, dataCloud, typeset: machineTs });

    let _license = null;

    /**
     * @readonly
     * @member {string} clusterName
     */
    Object.defineProperty(this, 'clusterName', {
      enumerable: true,
      get() {
        return kube.metadata.labels?.[apiLabels.CLUSTER_NAME] || null;
      },
    });

    /**
     * @readonly
     * @member {boolean} isController True if this Machine is a master node.
     */
    Object.defineProperty(this, 'isController', {
      enumerable: true,
      get() {
        return !!kube.metadata.labels?.[apiLabels.CLUSTER_CONTROLLER];
      },
    });

    /**
     * @member {License|null} license License used by this Machine. Null if none.
     */
    Object.defineProperty(this, 'license', {
      enumerable: true,
      get() {
        return _license;
      },
    });

    //// Initialize

    if (kube.spec.providerSpec.value.rhelLicense) {
      const licenseName = kube.spec.providerSpec.value.rhelLicense;
      _license =
        this.namespace.licenses.find((li) => li.name === licenseName) || null;
      if (!_license) {
        logger.warn(
          'Machine.constructor()',
          `Unable to find license name=${logValue(
            licenseName
          )} for machine=${logValue(this.name)} in namespace=${logValue(
            this.namespace.name
          )}`
        );
      }
    }
  }

  // NOTE: we don't have toEntity() because we don't show Machines in the Catalog
  //  at the moment (so we don't have a MachineEntity class for them)

  // NOTE: we don't have toModel() because we don't have a need to include machine
  //  metadata in a Catalog Entity Model at the moment (e.g. if we wanted to have
  //  machine metadata for each cluster, then we'd need toModel() here so we could
  //  generate machine models for use in cluster models)

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, namespace: ${logValue(
      this.namespace.name
    )}, license: ${logValue(this.license && this.license.name)}`;

    if (Object.getPrototypeOf(this).constructor === Machine) {
      return `{Machine ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
