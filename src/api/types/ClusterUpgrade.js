import { merge } from 'lodash';
import * as rtv from 'rtvjs';
import { logValue } from '../../util/logger';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { apiKinds } from '../apiConstants';
import { ResourceUpdate, resourceUpdateTs } from './ResourceUpdate';

/**
 * Typeset for an MCC API cluster upgrade resource.
 */
export const clusterUpgradeTs = mergeRtvShapes({}, resourceUpdateTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `ClusterUpgrade` class instance

  kind: [rtv.STRING, { oneOf: apiKinds.CLUSTER_UPGRADE_STATUS }],
  fromRelease: rtv.STRING,

  // NOTE: MCC will rename `toRelease` to `release` in a future release which means
  //  `toRelease` must now be optional; but if `release` isn't defined, `toRelease`
  //  MUST be defined since it predates the history features
  toRelease: [rtv.OPTIONAL, rtv.STRING],
  release: [
    rtv.OPTIONAL,
    rtv.STRING,
    (value, match, typeset, { parent }) => {
      // CAREFUL: use `parent` instead of `originalValue` from `context` param because
      //  this typeset gets executed at different levels of hierarchy, so `originalValue`
      //  will not always be what you think
      if (!value && !parent.toRelease) {
        throw new Error('/toRelease must be defined when /release is not');
      }
    },
  ],
});

/**
 * MCC API cluster deployment.
 * @class ClusterUpgrade
 */
export class ClusterUpgrade extends ResourceUpdate {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.kube Raw kube object payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {DataCloud} params.dataCloud Reference to the DataCloud used to get the data.
   */
  constructor({ kube, namespace, dataCloud }) {
    super({ kube, namespace, dataCloud, typeset: clusterUpgradeTs });

    /**
     * @readonly
     * @member {string} fromRelease The original version of the cluster.
     */
    Object.defineProperty(this, 'fromRelease', {
      enumerable: true,
      get() {
        return kube.fromRelease;
      },
    });

    /**
     * @readonly
     * @member {string} release The new version of the cluster.
     */
    Object.defineProperty(this, 'release', {
      enumerable: true,
      get() {
        // NOTE: `toRelease` will be renamed to `release` in a future MCC release
        return kube.release || kube.toRelease;
      },
    });
  }

  // NOTE: we don't have toEntity() because we don't show ClusterUpgrades in the Catalog at
  //  the moment (so we don't have a ClusterUpgradeEntity class for them either)

  /**
   * Converts this API Object into a Catalog Entity Model.
   * @returns {{ metadata: Object, spec: Object, status: Object }} Catalog Entity Model
   *  (use to create new Catalog Entity).
   */
  toModel() {
    const model = super.toModel();

    return merge({}, model, {
      spec: {
        fromRelease: this.fromRelease,
        release: this.release,
      },
    });
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, from: ${logValue(
      this.fromRelease
    )}, to: ${logValue(this.release)}`;

    if (Object.getPrototypeOf(this).constructor === ClusterUpgrade) {
      return `{ClusterUpgrade ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
