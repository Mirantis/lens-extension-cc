import { merge, omit } from 'lodash';
import * as rtv from 'rtvjs';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { NamedResource, namedResourceTs } from './NamedResource';
import { entityLabels } from '../../catalog/catalogEntities';
import { apiKinds } from '../apiConstants';
import { timestampTs } from '../apiTypesets';
import { logValue } from '../../util/logger';

/**
 * Typeset for an MCC API resource update (an update for any type of resource).
 *
 * An "update" is a list of statuses that represents an event in history that took
 *  place on a resource. Typically a cluster deployment or upgrade.
 */
export const resourceUpdateTs = mergeRtvShapes({}, namedResourceTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Credential` class instance

  kind: [
    rtv.STRING,
    {
      oneOf: [
        apiKinds.CLUSTER_DEPLOYMENT_STATUS,
        apiKinds.CLUSTER_UPGRADE_STATUS,
        apiKinds.MACHINE_DEPLOYMENT_STATUS,
        apiKinds.MACHINE_UPGRADE_STATUS,
      ],
    },
  ],

  metadata: {
    ownerReferences: [
      rtv.ARRAY,
      {
        min: 1,
        $: {
          kind: [rtv.STRING, { oneOf: [apiKinds.CLUSTER, apiKinds.MACHINE] }], // e.g. 'Cluster'
          name: rtv.STRING,
          uid: rtv.STRING,
        },
      },
    ],
  },

  stages: [
    [
      {
        name: rtv.STRING, // short message/phrase/summary, more like a title
        message: [rtv.OPTIONAL, rtv.STRING], // detailed message, if any

        // NOTE: `status` field REQUIRES MCC v2.22+
        // NOTE: we don't validate this against `apiUpdateStatuses` in case additional statuses
        //  are added in the future without our knowledge; we just expect a non-empty string
        status: rtv.STRING, // status code like 'Success', 'InProgress', 'NotStarted', 'Fail'

        // ISO8601, not provided unless stage is done (successfully or has been attempted
        //  at least once)
        timestamp: [rtv.OPTIONAL, ...timestampTs],
      },
    ],
  ],
});

/**
 * Update for any type of MCC API namespaced resource.
 * @class ResourceUpdate
 */
export class ResourceUpdate extends NamedResource {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.kube Raw kube object payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {DataCloud} params.dataCloud Reference to the DataCloud used to get the data.
   * @param {rtv.Typeset} params.typeset Typeset for verifying the data.
   */
  constructor({ kube, namespace, dataCloud, typeset = resourceUpdateTs }) {
    super({ kube, namespace, dataCloud, typeset });

    /**
     * @readonly
     * @member {string} targetKind API kind of the resource to which this update pertains.
     *  Will be one of the `apiKinds` enum values.
     */
    Object.defineProperty(this, 'targetKind', {
      enumerable: true,
      get() {
        return kube.metadata.ownerReferences[0].kind;
      },
    });

    /**
     * @readonly
     * @member {string} targetUid UID of the resource to which this update pertains.
     */
    Object.defineProperty(this, 'targetUid', {
      enumerable: true,
      get() {
        return kube.metadata.ownerReferences[0].uid;
      },
    });

    /**
     * @readonly
     * @member {string} targetName Name of the resource to which this update pertains.
     */
    Object.defineProperty(this, 'targetName', {
      enumerable: true,
      get() {
        return kube.metadata.ownerReferences[0].name;
      },
    });

    /**
     * @readonly
     * @member {Array<{ name: string, message?: string, status: string, time: Date }>} stages
     *  List of objects describing each stage of the update.
     */
    Object.defineProperty(this, 'stages', {
      enumerable: true,
      get() {
        return kube.stages.map((stage) => ({
          name: stage.name,
          message: stage.message || null,
          status: stage.status,
          time: stage.timestamp ? new Date(stage.timestamp) : null,
        }));
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
      metadata: {
        labels: {
          [entityLabels.CLOUD]: this.dataCloud.name,
          [entityLabels.NAMESPACE]: this.namespace.name,
        },
      },
      spec: {
        targetKind: this.targetKind,
        targetUid: this.targetUid,
        targetName: this.targetName,
        stages: this.stages.map((stage) => ({
          ...omit(stage, 'time'),
          timeAt: stage.time.toISOString(),
        })),
      },
      status: {
        phase: 'available',
      },
    });
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, targetKind: ${logValue(
      this.targetKind
    )}, targetName: ${logValue(this.targetName)}, targetUid: ${logValue(
      this.targetUid
    )}, stages: ${this.stages.length}`;

    if (Object.getPrototypeOf(this).constructor === ResourceUpdate) {
      return `{ResourceUpdate ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
