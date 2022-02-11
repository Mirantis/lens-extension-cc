import { ApiObject } from './ApiObject';
import * as rtv from 'rtvjs';
import { Namespace } from './Namespace';

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
  constructor(data, namespace) {
    super(data);
    DEV_ENV &&
      rtv.verify(
        { data, namespace },
        {
          data: licenseSpec,
          namespace: [rtv.CLASS_OBJECT, { ctor: Namespace }],
        }
      );

    /** @member {Namespace} */
    this.namespace = namespace;

    /** @member {string} */
    this.kind = data.kind;

    // TODO this need to find and  define
    this.source = null;
    this.labels = [];
  }
}
