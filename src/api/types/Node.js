import { merge } from 'lodash';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { apiKinds, apiLabels } from '../apiConstants';
import { NamedResource, namedResourceTs } from './NamedResource';
import * as strings from '../../strings';

/**
 * Typeset for a namespaced Machine and Cluster resources.
 */
export const nodeTs = mergeRtvShapes({}, namedResourceTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Node` class instance
  // nothing specific for now that can be provided __at this level__ for inheriting classes
  //  given the fact that `mergeRtvShapes()` does NOT merge deep into array typesets
});

/**
 * Base class for namespaced Machine and Cluster resources.
 * @class Node
 */
export class Node extends NamedResource {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.kube Raw kube object payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {DataCloud} params.dataCloud Reference to the DataCloud used to get the data.
   * @param {rtv.Typeset} params.typeset Typeset for verifying the data.
   */
  constructor({ kube, namespace, dataCloud, typeset }) {
    super({ kube, namespace, dataCloud, typeset });

    /**
     * @readonly
     * @member {string|null} region
     */
    Object.defineProperty(this, 'region', {
      enumerable: true,
      get() {
        // NOTE: AWS clusters, while they have a 'region' label like all other cluster
        //  types, also have a `kube.spec?.providerSpec?.value?.region` which provides
        //  a better value (i.e. the label will always be 'aws' while the provider
        //  region will be what we want, like 'us-west-2'); we assume here that if
        //  there's a provider-specific region, that will always be more precise than
        //  the label, regardless of cluster provider type
        return (
          kube.spec?.providerSpec?.value?.region ||
          kube.metadata.labels?.[apiLabels.KAAS_REGION] ||
          null
        );
      },
    });

    /**
     * @readonly
     * @member {string|null} provider
     */
    Object.defineProperty(this, 'provider', {
      enumerable: true,
      get() {
        return kube.metadata.labels?.[apiLabels.KAAS_PROVIDER] || null;
      },
    });

    /**
     * @readonly
     * @member {Array<{ message: string, ready: boolean, type: string }>} conditions
     *  List of conditions, or empty list if none.
     */
    Object.defineProperty(this, 'conditions', {
      enumerable: true,
      get() {
        return kube.status?.providerStatus?.conditions || [];
      },
    });

    /**
     * Node status message. This is a combination of all NON-ready conditions,
     *  or if all ready, then a "Ready" message.
     * @readonly
     * @member {string} status
     */
    Object.defineProperty(this, 'status', {
      enumerable: true,
      get() {
        const { providerStatus } = kube.status || {};

        if (!providerStatus) {
          // we don't have any status-related info yet
          return strings.apiResource.status.unknown();
        }

        if (providerStatus.ready) {
          // overall status is ready, so we're ready; assume we don't need to look any further
          return strings.apiResource.status.ready();
        }

        // NOTE: only clusters have a helm status
        if (
          this.conditions.length < 1 &&
          (this.kind !== apiKinds.CLUSTER || !providerStatus.helm)
        ) {
          // not enough info to determine status issues, but we do have some status
          //  reporting, so go with pending
          return strings.apiResource.status.pending();
        }

        const notices = [];
        this.conditions.forEach((c) => {
          if (!c.ready) {
            notices.push(c.message);
          }
        });

        if (this.kind === apiKinds.CLUSTER && !providerStatus.helm.ready) {
          notices.push(strings.apiResource.notice.helmNotReady());
        }

        if (notices.length > 0) {
          return `${strings.apiResource.status.pending()}: ${notices
            .map((n) => `"${n}"`)
            .join(', ')}`;
        }

        // no notices, but overall `ready` flag is false, so assume something is still missing
        return strings.apiResource.status.pending();
      },
    });

    /**
     * True if the Node is fully-operational.
     * @readonly
     * @member {boolean} ready
     */
    Object.defineProperty(this, 'ready', {
      enumerable: true,
      get() {
        return !!kube.status?.providerStatus?.ready;
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
        region: this.region,
        provider: this.provider,
        conditions: this.conditions,
        apiStatus: this.status,
        ready: this.ready,
      },
    });
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, conditions: ${
      this.conditions.length
    }/${
      this.conditions.length < 1 || this.conditions.every((c) => c.ready)
        ? 'ready'
        : 'pending'
    }`;

    if (Object.getPrototypeOf(this).constructor === Node) {
      return `{Node ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
