import * as rtv from 'rtvjs';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { apiKinds } from '../apiConstants';
import { ResourceUpdate, resourceUpdateTs } from './ResourceUpdate';

/**
 * Typeset for an MCC API machine deployment (i.e. installation) resource.
 */
export const machineDeploymentTs = mergeRtvShapes({}, resourceUpdateTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `MachineDeployment` class instance

  kind: [rtv.STRING, { oneOf: apiKinds.MACHINE_DEPLOYMENT_STATUS }],
});

/**
 * MCC API machine deployment.
 * @class MachineDeployment
 */
export class MachineDeployment extends ResourceUpdate {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.data Raw data payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {Cloud} params.cloud Reference to the Cloud used to get the data.
   */
  constructor({ data, namespace, cloud }) {
    super({ data, cloud, namespace, typeset: machineDeploymentTs });
  }

  // NOTE: we don't have toEntity() because we don't show MachineDeployments in the Catalog at
  //  the moment (so we don't have a MachineDeploymentEntity class for them either)

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

    if (Object.getPrototypeOf(this).constructor === MachineDeployment) {
      return `{MachineDeployment ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
