import { merge } from 'lodash';
import * as rtv from 'rtvjs';
import { logValue } from '../../util/logger';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { apiKinds } from '../apiConstants';
import { ResourceUpdate, resourceUpdateTs } from './ResourceUpdate';

/**
 * Typeset for an MCC API cluster deployment (i.e. installation) resource.
 */
export const clusterDeploymentTs = mergeRtvShapes({}, resourceUpdateTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `ClusterDeployment` class instance

  kind: [rtv.STRING, { oneOf: apiKinds.CLUSTER_DEPLOYMENT_STATUS }],
  // TODO[cluster-history]: add this when release (MCC v2.22+)
  // release: rtv.STRING, // release version deployed
});

/**
 * MCC API cluster deployment.
 * @class ClusterDeployment
 */
export class ClusterDeployment extends ResourceUpdate {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.kube Raw kube object payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {DataCloud} params.dataCloud Reference to the DataCloud used to get the data.
   */
  constructor({ kube, namespace, dataCloud }) {
    super({ kube, namespace, dataCloud, typeset: clusterDeploymentTs });

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

  // NOTE: we don't have toEntity() because we don't show ClusterDeployments in the Catalog at
  //  the moment (so we don't have a ClusterDeploymentEntity class for them either)

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

    if (Object.getPrototypeOf(this).constructor === ClusterDeployment) {
      return `{ClusterDeployment ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
