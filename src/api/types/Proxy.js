import * as rtv from 'rtvjs';
import { merge, get } from 'lodash';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { Resource, resourceTs } from './Resource';
import { Namespace } from './Namespace';
import { ProxyEntity, proxyEntityPhases } from '../../catalog/ProxyEntity';
import { apiKinds } from '../apiConstants';
import { logValue } from '../../util/logger';

/**
 * Typeset for an MCC Proxy API resource.
 */
export const proxyTs = mergeRtvShapes({}, resourceTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Credential` class instance

  kind: [rtv.STRING, { oneOf: apiKinds.PROXY }],
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
 * MCC proxy API resource.
 * @class Proxy
 */
export class Proxy extends Resource {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.data Raw data payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {Cloud} params.cloud Reference to the Cloud used to get the data.
   */
  constructor({ data, namespace, cloud }) {
    super({ data, cloud, typeset: proxyTs });

    DEV_ENV &&
      rtv.verify(
        { namespace },
        { namespace: [rtv.CLASS_OBJECT, { ctor: Namespace }] }
      );

    /** @member {Namespace} namespace */
    Object.defineProperty(this, 'namespace', {
      enumerable: true,
      get() {
        return namespace;
      },
    });

    /** @member {string} region */
    Object.defineProperty(this, 'region', {
      enumerable: true,
      get() {
        return get(data.metadata, 'labels["kaas.mirantis.com/region"]', null);
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

  /**
   * Converts this API Object into a Catalog Entity that can be inserted into a Catalog Source.
   * @returns {ProxyEntity}
   */
  toEntity() {
    return new ProxyEntity(this.toModel());
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, namespace: ${logValue(
      this.namespace.name
    )}, http: ${logValue(this.httpProxy)}, https: ${logValue(this.httpsProxy)}`;

    if (Object.getPrototypeOf(this).constructor === Proxy) {
      return `{Proxy ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
