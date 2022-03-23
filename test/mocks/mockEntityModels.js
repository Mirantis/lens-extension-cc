//
// Mock Catalog Entity Models (use these to create new entities like
//  `new SshKeyEntity(model)`)
//

export const sshKeyModels = [
  {
    metadata: {
      kind: 'PublicKey',
      source: 'mirantis-container-cloud',
      uid: 'sshkey-uid-1',
      name: 'SSH Key 1',
      namespace: 'lex-ns-1',
      cloudUrl: 'https://container-cloud.acme.com',
      labels: {
        mgmtCluster: 'mcc-1',
        project: 'project-1',
      },
    },
    spec: {
      createdAt: '2021-12-03T20:38:04Z',
      publicKey: 'sshkey-public-key-1',
    },
    status: {
      phase: 'available',
    },
  },
  {
    metadata: {
      kind: 'PublicKey',
      source: 'mirantis-container-cloud',
      uid: 'sshkey-uid-2',
      name: 'SSH Key 2',
      namespace: 'lex-ns-2',
      cloudUrl: 'https://container-cloud.acme.com',
      labels: {
        mgmtCluster: 'mcc-1',
        project: 'project-1',
      },
    },
    spec: {
      createdAt: '2021-12-03T20:38:04Z',
      publicKey: 'sshkey-public-key-2',
    },
    status: {
      phase: 'available',
    },
  },
];

export const credentialModels = [
  {
    metadata: {
      kind: 'AWSCredential',
      source: 'mirantis-container-cloud',
      uid: 'credential-uid-1',
      name: 'Credential 1',
      namespace: 'lex-ns-1',
      cloudUrl: 'https://container-cloud.acme.com',
      labels: {
        mgmtCluster: 'mcc-1',
        project: 'project-1',
      },
    },
    spec: {
      provider: 'aws',
      region: 'eu',
      valid: true,
      createdAt: '2021-12-03T20:38:04Z',
    },
    status: {
      phase: 'available',
    },
  },
  {
    metadata: {
      kind: 'AzureCredential',
      source: 'mirantis-container-cloud',
      uid: 'credential-uid-2',
      name: 'Credential 2',
      namespace: 'lex-ns-2',
      cloudUrl: 'https://container-cloud.acme.com',
      labels: {
        mgmtCluster: 'mcc-1',
        project: 'project-1',
      },
    },
    spec: {
      provider: 'azure',
      region: 'cz',
      valid: false,
      createdAt: '2021-12-03T20:38:04Z',
    },
    status: {
      phase: 'available',
    },
  },
];

export const proxyModels = [
  {
    metadata: {
      kind: 'Proxy',
      source: 'mirantis-container-cloud',
      uid: 'proxy-uid-1',
      name: 'Proxy 1',
      namespace: 'lex-ns-1',
      cloudUrl: 'https://container-cloud.acme.com',
      labels: {
        mgmtCluster: 'mcc-1',
        project: 'project-1',
      },
    },
    spec: {
      region: 'aws-us-east-1',
      httpProxy: 'http://east.proxy.com',
      httpsProxy: 'https://east.proxy.com',
      createdAt: '2021-12-03T20:38:04Z',
    },
    status: {
      phase: 'available',
    },
  },
  {
    metadata: {
      kind: 'Proxy',
      source: 'mirantis-container-cloud',
      uid: 'proxy-uid-2',
      name: 'Proxy 2',
      namespace: 'lex-ns-2',
      cloudUrl: 'https://container-cloud.acme.com',
      labels: {
        mgmtCluster: 'mcc-1',
        project: 'project-1',
      },
    },
    spec: {
      region: 'aws-us-west-1',
      httpProxy: 'http://west.proxy.com',
      httpsProxy: 'https://west.proxy.com',
      createdAt: '2021-12-03T20:38:04Z',
    },
    status: {
      phase: 'available',
    },
  },
];

export const licenseModels = [
  {
    metadata: {
      kind: 'RHELLicense',
      source: 'mirantis-container-cloud',
      uid: 'license-uid-1',
      name: 'License 1',
      namespace: 'lex-ns-1',
      cloudUrl: 'https://container-cloud.acme.com',
      labels: {
        mgmtCluster: 'mcc-1',
        project: 'project-1',
      },
    },
    spec: {
      createdAt: '2021-12-03T20:38:04Z',
    },
    status: {
      phase: 'available',
    },
  },
  {
    metadata: {
      kind: 'RHELLicense',
      source: 'mirantis-container-cloud',
      uid: 'license-uid-2',
      name: 'License 2',
      namespace: 'lex-ns-2',
      cloudUrl: 'https://container-cloud.acme.com',
      labels: {
        mgmtCluster: 'mcc-1',
        project: 'project-1',
      },
    },
    spec: {
      createdAt: '2021-12-03T20:38:04Z',
    },
    status: {
      phase: 'available',
    },
  },
];
