import * as rtv from 'rtvjs';
import { ApiObject } from './ApiObject';
import { get } from 'lodash';

const proxySpec = {
  apiVersion: rtv.STRING,
  kind: [rtv.REQUIRED, rtv.STRING],
  metadata: {
    name: [rtv.REQUIRED, rtv.STRING],
    namespace: [rtv.REQUIRED, rtv.STRING],
    uid: [rtv.REQUIRED, rtv.STRING],
    creationTimestamp: rtv.STRING, // ISO8601 timestamp
    resourceVersion: rtv.STRING,
    finalizers: [rtv.OPTIONAL, rtv.ARRAY, rtv.OBJECT],
    managedFields: [rtv.ARRAY, { $: [rtv.OBJECT] }], // complex nested object

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
};

export class Proxy extends ApiObject {
  constructor(data) {
    super(data);
    DEV_ENV && rtv.verify(data, proxySpec);

    /** @member {string} */
    this.kind = data.kind;

    /** @member {string}  namespaceName */
    this.namespace = data.metadata.namespace;

    /** @member {string} */
    this.region = get(
      data.metadata,
      'labels["kaas.mirantis.com/region"]',
      null
    );

    /** @member {string} */
    this.httpProxy = data.spec.httpProxy;

    /** @member {string} */
    this.httpsProxy = data.spec.httpsProxy;

    // TODO this need to find and  define
    this.status = null;
    this.source = null;
    this.labels = [];
  }
}
