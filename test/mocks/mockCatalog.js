import * as consts from '../../src/constants';

export const credentials = [
  {
    metadata: {
      source: consts.catalog.source,
      uid: 'credential-uid-1',
      name: 'Credential 1',
      namespace: 'lex-ns-1',
      cloudUrl: 'https://container-cloud.acme.com',
      labels: {
        managementCluster: 'mcc-1',
        project: 'project-1',
      },
    },
    spec: {
      provider: 'aws',
      region: 'eu',
      status: 'Processing',
      created: '2021-08-12 (4 months)'
    },
    status: {
      phase: 'available',
    },
  },
  {
    metadata: {
      source: consts.catalog.source,
      uid: 'credential-uid-2',
      name: 'Credential 2',
      namespace: 'lex-ns-2',
      cloudUrl: 'https://container-cloud.acme.com',
      labels: {
        managementCluster: 'mcc-1',
        project: 'project-1',
      },
    },
    spec: {
      provider: 'azure',
      region: 'cz',
      status: 'Processing',
      created: '2021-08-10 (6 months)'
    },
    status: {
      phase: 'available',
    },
  },
];
