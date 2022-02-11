import * as rtv from 'rtvjs';
import { ApiObject } from './ApiObject';
import { Namespace } from './Namespace';

const sshKeySpec = {
  apiVersion: rtv.STRING,
  kind: [rtv.REQUIRED, rtv.STRING],
  metadata: {
    name: [rtv.REQUIRED, rtv.STRING],
    namespace: [rtv.REQUIRED, rtv.STRING],
    uid: [rtv.REQUIRED, rtv.STRING],
    creationTimestamp: rtv.STRING, // ISO8601 timestamp
    managedFields: [rtv.ARRAY, { $: [rtv.OBJECT] }], // complex nested object
    resourceVersion: rtv.STRING,
  },
  spec: {
    publicKey: rtv.STRING,
  },
};

export class SshKey extends ApiObject {
  constructor(data, namespace) {
    super(data);
    DEV_ENV &&
      rtv.verify(
        { data, namespace },
        { data: sshKeySpec, namespace: [rtv.CLASS_OBJECT, { ctor: Namespace }] }
      );

    /** @member {Namespace} */
    this.namespace = namespace;

    /** @member {string} */
    this.kind = data.kind;

    /** @member {string} */
    this.publicKey = data.spec.publicKey;

    // TODO this need to find and  define
    this.status = null;
    this.source = null;
    this.labels = [];
  }
}
