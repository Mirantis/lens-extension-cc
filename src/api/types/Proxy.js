import * as rtv from 'rtvjs';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { ApiObject, apiObjectTs } from './ApiObject';
import { get } from 'lodash';
import { Namespace } from './Namespace';

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
  constructor(data, namespace) {
    super(data);

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
