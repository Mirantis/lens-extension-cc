import * as rtv from 'rtvjs';
import { get } from 'lodash';
import { ApiObject } from './ApiObject';
import { Namespace } from './Namespace';

export const credentialTypes = {
  AWS_CREDENTIAL: 'awscredential',
  BYO_CREDENTIAL: 'byocredential',
  OPENSTACK_CREDENTIAL: 'openstackcredential',
};

export const credentialTypesList = Object.values(credentialTypes);

const specByType = {
  [credentialTypes.AWS_CREDENTIAL]: {
    accessKeyID: rtv.STRING,
    secretAccessKey: rtv.OBJECT,
  },
  [credentialTypes.OPENSTACK_CREDENTIAL]: {
    regionName: rtv.STRING,
    auth: {
      authURL: rtv.STRING,
      password: rtv.OBJECT,
      projectID: rtv.STRING,
      userDomainName: rtv.STRING,
      userName: rtv.STRING,
    },
  },
  [credentialTypes.BYO_CREDENTIAL]: rtv.OBJECT, // define in details later
};

const getCredentialSpec = (type) => {
  return {
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
    spec: specByType[type],
    status: {
      message: [rtv.OPTIONAL, rtv.STRING],
      valid: rtv.BOOLEAN,
    },
  };
};

export class Credential extends ApiObject {
  constructor(data, namespace, credentialType) {
    super(data);
    // now we have check only for openStack. It's hard to predict other types
    DEV_ENV &&
      rtv.verify(
        { data, namespace, credentialType },
        {
          data: getCredentialSpec(credentialType),
          namespace: [rtv.CLASS_OBJECT, { ctor: Namespace }],
          credentialType: [rtv.STRING, { oneOf: credentialTypesList }],
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

    /** @member {string|null} */
    this.provider = get(
      data.metadata,
      'labels["kaas.mirantis.com/provider"]',
      null
    );
  }
}
