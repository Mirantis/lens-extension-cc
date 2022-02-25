import * as rtv from 'rtvjs';
import { merge } from 'lodash';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { ApiObject, apiObjectTs } from './ApiObject';
import { get } from 'lodash';
import { Namespace } from './Namespace';
import { proxyEntityPhases } from '../../catalog/ProxyEntity';

/**
 * Typeset for an MCC Proxy object.
 */
export const apiProxyTs = mergeRtvShapes({}, apiObjectTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Credential` class instance

  kind: [rtv.STRING, { oneOf: 'Proxy' }],
  metadata: {
    labels: [
      rtv.OPTIONAL,
      {
        'kaas.mirantis.com/region': [rtv.OPTIONAL, rtv.STRING],
      },
    ],
  },
  spec: {
    httpProxy: rtv.STRING,
    httpsProxy: rtv.STRING,
  },
});

/**
 * MCC proxy.
 * @class Proxy
 * @param {Object} data Raw cluster data payload from the API.
 * @param {Namespace} namespace Namespace to which this object belongs.
 */
export class Proxy extends ApiObject {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.data Raw data payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {Cloud} params.cloud Reference to the Cloud used to get the data.
   */
  constructor({ data, namespace, cloud }) {
    super({ data, cloud });

    DEV_ENV &&
      rtv.verify(
        { data, namespace },
        { data: apiProxyTs, namespace: [rtv.CLASS_OBJECT, { ctor: Namespace }] }
      );

    /** @member {Namespace} */
    Object.defineProperty(this, 'namespace', {
      enumerable: true,
      get() {
        return namespace;
      },
    });

    /** @member {string} */
    Object.defineProperty(this, 'kind', {
      enumerable: true,
      get() {
        return data.kind;
      },
    });

    /** @member {string} */
    Object.defineProperty(this, 'region', {
      enumerable: true,
      get() {
        return get(data.metadata, 'labels["kaas.mirantis.com/region"]', null);
      },
    });

    /** @member {string} */
    Object.defineProperty(this, 'httpProxy', {
      enumerable: true,
      get() {
        return data.spec.httpProxy;
      },
    });

    /** @member {string} */
    Object.defineProperty(this, 'httpsProxy', {
      enumerable: true,
      get() {
        return data.spec.httpsProxy;
      },
    });
  }

  /**
   * Converts this API Object into a Catalog Entity.
   * @returns {Object} Entity object.
   * @override
   */
  toEntity() {
    const entity = super.toEntity();

    return merge({}, entity, {
      metadata: {
        namespace: this.namespace.name,
        labels: {
          managementCluster: this.cloud.name,
          project: this.namespace.name,
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

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, kind: "${this.kind}", namespace: "${
      this.namespace.name
    }", http: "${this.httpProxy}", https: "${this.httpsProxy}"`;

    if (Object.getPrototypeOf(this).constructor === Proxy) {
      return `{Proxy ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
