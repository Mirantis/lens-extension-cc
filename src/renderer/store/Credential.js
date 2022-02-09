import * as rtv from 'rtvjs';

const openStackCredentialSpec = {
  apiVersion: rtv.STRING,
  kind: [rtv.REQUIRED, rtv.STRING],
  metadata: {
    name: rtv.STRING,
    namespace: rtv.STRING,
    uid: rtv.STRING,
    creationTimestamp: rtv.STRING, // ISO8601 timestamp
    finalizers: [rtv.ARRAY, rtv.OBJECT],
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

export class Credential {
  constructor(data, namespace) {
    DEV_ENV &&
      rtv.verify(
        { data, namespace },
        {
          namespace: [rtv.REQUIRED, rtv.STRING],
          data: {
            openstackcredential: [
              rtv.OPTIONAL,
              rtv.ARRAY,
              { $: [openStackCredentialSpec] },
            ],
            awscredential: [rtv.OPTIONAL, rtv.ARRAY],
            byocredential: [rtv.OPTIONAL, rtv.ARRAY],
          },
        }
      );
    this.namespace = namespace;
    this.openstackcredential = data?.openstackcredential || [];
    this.awscredential = data?.awscredential || [];
    this.byocredential = data?.byocredential || [];

    Object.defineProperty(this, 'allCredentialsCount', {
      enumerable: true,
      get() {
        return (
          this.openstackcredential.length +
          this.awscredential.length +
          this.byocredential.length
        );
      },
    });
  }
}
