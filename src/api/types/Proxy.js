import * as rtv from 'rtvjs';
import { merge } from 'lodash';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { NamedResource, namedResourceTs } from './NamedResource';
import { entityLabels } from '../../catalog/catalogEntities';
import { ProxyEntity, proxyEntityPhases } from '../../catalog/ProxyEntity';
import { apiKinds, apiLabels } from '../apiConstants';
import { logValue } from '../../util/logger';

/**
 * Typeset for an MCC Proxy API resource.
 */
export const proxyTs = mergeRtvShapes({}, namedResourceTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Proxy` class instance

  kind: [rtv.STRING, { oneOf: apiKinds.PROXY }],
  metadata: {
    labels: [
      rtv.OPTIONAL,
      {
        [apiLabels.KAAS_REGION]: [rtv.OPTIONAL, rtv.STRING],
      },
    ],
  },
  spec: {
    httpProxy: rtv.STRING,
    httpsProxy: rtv.STRING,
  },
});

/**
 * MCC proxy API resource.
 * @class Proxy
 */
export class Proxy extends NamedResource {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.data Raw data payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {Cloud} params.cloud Reference to the Cloud used to get the data.
   */
  constructor({ data, namespace, cloud }) {
    super({ data, namespace, cloud, typeset: proxyTs });

    /** @member {string} region */
    Object.defineProperty(this, 'region', {
      enumerable: true,
      get() {
        return data.metadata.labels?.[apiLabels.KAAS_REGION] || null;
      },
    });

    /** @member {string} httpProxy */
    Object.defineProperty(this, 'httpProxy', {
      enumerable: true,
      get() {
        return data.spec.httpProxy;
      },
    });

    /** @member {string} httpsProxy */
    Object.defineProperty(this, 'httpsProxy', {
      enumerable: true,
      get() {
        return data.spec.httpsProxy;
      },
    });
  }

  /**
   * Converts this API Object into a Catalog Entity Model.
   * @returns {{ metadata: Object, spec: Object, status: Object }} Catalog Entity Model
   *  (use to create new Catalog Entity).
   * @override
   */
  toModel() {
    const model = super.toModel();

    return merge({}, model, {
      metadata: {
        labels: {
          [entityLabels.CLOUD]: this.cloud.name,
          [entityLabels.NAMESPACE]: this.namespace.name,
        },
      },
      spec: {
        region: this.region,
        httpProxy: this.httpProxy,
        httpsProxy: this.httpsProxy,
      },
      status: {
        phase: proxyEntityPhases.AVAILABLE,
      },
    });
  }

  /**
   * Converts this API Object into a Catalog Entity that can be inserted into a Catalog Source.
   * @returns {ProxyEntity}
   */
  toEntity() {
    return new ProxyEntity(this.toModel());
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, http: ${logValue(
      this.httpProxy
    )}, https: ${logValue(this.httpsProxy)}`;

    if (Object.getPrototypeOf(this).constructor === Proxy) {
      return `{Proxy ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
