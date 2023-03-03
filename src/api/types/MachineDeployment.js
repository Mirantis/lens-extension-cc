import { merge } from 'lodash';
import * as rtv from 'rtvjs';
import { logValue } from '../../util/logger';
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
  // TODO[cluster-history]: add this when release (MCC v2.22+)
  // release: rtv.STRING, // release version deployed
});

/**
 * MCC API machine deployment.
 * @class MachineDeployment
 */
export class MachineDeployment extends ResourceUpdate {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.kube Raw kube object payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {DataCloud} params.dataCloud Reference to the DataCloud used to get the data.
   */
  constructor({ kube, namespace, dataCloud }) {
    super({ kube, namespace, dataCloud, typeset: machineDeploymentTs });

    /**
     * @readonly
     * @member {string} release The version of the cluster. Should match the cluster's
     *  `currentVersion`.
     */
    Object.defineProperty(this, 'release', {
      enumerable: true,
      get() {
        return kube.release || '-1.0.0'; // TODO[cluster-history]: remove '-1.0.0' fallback
      },
    });
  }

  // NOTE: we don't have toEntity() because we don't show MachineDeployments in the Catalog at
  //  the moment (so we don't have a MachineDeploymentEntity class for them either)

  /**
   * Converts this API Object into a Catalog Entity Model.
   * @returns {{ metadata: Object, spec: Object, status: Object }} Catalog Entity Model
   *  (use to create new Catalog Entity).
   */
  toModel() {
    const model = super.toModel();

    return merge({}, model, {
      spec: {
        release: this.release,
      },
    });
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, to: ${logValue(this.release)}`;

    if (Object.getPrototypeOf(this).constructor === MachineDeployment) {
      return `{MachineDeployment ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
