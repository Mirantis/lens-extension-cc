import { ApiObject } from './ApiObject';
import * as rtv from 'rtvjs';

const licenseSpec = {
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
  },
  spec: {
    password: rtv.OBJECT,
    username: rtv.STRING,
  },
};
export class License extends ApiObject {
  constructor(data) {
    super(data);
    DEV_ENV && rtv.verify(data, licenseSpec);

    /** @member {string} */
    this.kind = data.kind;

    /** @member {string}  namespaceName */
    this.namespace = data.metadata.namespace;

    // TODO this need to find and  define
    this.source = null;
    this.labels = [];
  }
}
