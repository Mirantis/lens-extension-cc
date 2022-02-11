import * as rtv from 'rtvjs';
import { get } from 'lodash';
import { ApiObject } from './ApiObject';
import { Namespace } from './Namespace';

export const credentialTypes = [
  'awscredential',
  'byocredential',
  'openstackcredential',
];

const openStackCredentialSpec = {
  apiVersion: rtv.STRING,
  kind: [rtv.REQUIRED, rtv.STRING],
  metadata: {
    name: rtv.STRING,
    namespace: rtv.STRING,
    uid: rtv.STRING,
    finalizers: [rtv.OPTIONAL, rtv.ARRAY, rtv.OBJECT],
    managedFields: [rtv.ARRAY, { $: [rtv.OBJECT] }], // complex nested object
    resourceVersion: rtv.STRING,
    labels: [
      rtv.OPTIONAL,
      {
        'kaas.mirantis.com/provider': [rtv.OPTIONAL, rtv.STRING],
        'kaas.mirantis.com/region': [rtv.OPTIONAL, rtv.STRING],
      },
    ],
  },
  spec: {
    regionName: rtv.STRING,
    auth: {
      authURL: rtv.STRING,
      password: rtv.OBJECT, // do we need details here?
      projectID: rtv.STRING,
      userDomainName: rtv.STRING,
      userName: rtv.STRING,
    },
  },
  status: {
    valid: rtv.BOOLEAN,
  },
};

export class Credential extends ApiObject {
  constructor(data, namespace) {
    super(data);
    // now we have check only for openStack. It's hard to predict other types
    DEV_ENV &&
      rtv.verify(
        { data, namespace },
        {
          data: openStackCredentialSpec,
          namespace: [rtv.CLASS_OBJECT, { ctor: Namespace }],
        }
      );

    /** @member {string} */
    this.kind = data.kind;

    /** @member {Namespace} */
    this.namespace = namespace;

    /** @member {string} */
    this.region = get(
      data.metadata,
      'labels["kaas.mirantis.com/region"]',
      null
    );

    this.provider = get(
      data.metadata,
      'labels["kaas.mirantis.com/provider"]',
      null
    );

    // TODO this need to find and  define
    this.status = data.status.valid ? 'Connected' : 'Disconnected';
    this.source = null;
    this.labels = [];
  }
}
