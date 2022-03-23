import * as rtv from 'rtvjs';
import { apiKinds, apiLabels } from '../apiConstants';
import { Resource } from './Resource';
import { Namespace } from './Namespace';
import * as strings from '../../strings';

/**
 * Base class for namespaced Machine and Cluster resources.
 * @class Node
 */
export class Node extends Resource {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.data Raw data payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {Cloud} params.cloud Reference to the Cloud used to get the data.
   * @param {rtv.Typeset} params.typeset Typeset for verifying the data.
   */
  constructor({ data, namespace, cloud, typeset }) {
    super({
      data,
      cloud,
      typeset,
    });

    DEV_ENV &&
      rtv.verify(
        { namespace },
        {
          namespace: [rtv.CLASS_OBJECT, { ctor: Namespace }],
        }
      );

    /**
     * @readonly
     * @member {Namespace} namespace
     */
    Object.defineProperty(this, 'namespace', {
      enumerable: true,
      get() {
        return namespace;
      },
    });

    /**
     * @readonly
     * @member {string} region
     */
    Object.defineProperty(this, 'region', {
      enumerable: true,
      get() {
        return data.metadata.labels?.[apiLabels.KAAS_REGION] || null;
      },
    });

    /**
     * @readonly
     * @member {string} provider
     */
    Object.defineProperty(this, 'provider', {
      enumerable: true,
      get() {
        return data.metadata.labels?.[apiLabels.KAAS_PROVIDER] || null;
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
        const { providerStatus } = data.status || {};

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
          !providerStatus.conditions &&
          (this.kind !== apiKinds.CLUSTER || !providerStatus.helm)
        ) {
          // not enough info to determine status issues, but we do have some status
          //  reporting, so go with pending
          return strings.apiResource.status.pending();
        }

        const notices = [];
        providerStatus.conditions.forEach((c) => {
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
        return !!data.status?.providerStatus?.ready;
      },
    });
  }
}
