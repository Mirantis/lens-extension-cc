export const mockExtCloud = {
  cloud: {
    id_token:
      'id-token-1',
    expires_in: 100,
    refresh_token:
      'refresh-token-1',
    refresh_expires_in: 200,
    idpClientId: null,
    username: 'user@test.com',
    cloudUrl: 'https://cloud-url.com',
    name: 'Container name',
    syncAll: false,
    syncedNamespaces: [],
  },
  loading: false,
  namespaces: [
    {
      name: 'namespaces-1',
      clusters: [],
      sshKeys: [],
      credentials: [{}],
    },
    {
      name: 'namespaces-2',
      clusters: [
        {
          id: 'id-2',
          name: 'name-2',
          namespace: 'namespaces-2',
          created: '2020-20-20',
          deleteInProgress: false,
          isManagementCluster: false,
          ready: true,
          serverUrl: 'https://123.12.12.12:123',
          idpIssuerUrl:
            'https://isseu-url.com',
          idpCertificate:
            'sertificate',
          idpClientId: 'id',
          apiCertificate:
            'testsertificate==',
          ucpUrl: 'https://123.12.123.1:1234',
          provider: 'provider-1',
          region: 'region-eu',
        },
      ],
      sshKeys: [],
      credentials: [{}],
    },
    {
      name: 'namespaces-3',
      clusters: [
        {
          id: 'id-3',
          name: 'name-3',
          namespace: 'namespaces-3',
          created: '2020-20-20',
          deleteInProgress: false,
          isManagementCluster: false,
          ready: true,
          serverUrl: 'https://123.12.12.12:123',
          idpIssuerUrl:
            'https://isseu-url.com',
          idpCertificate:
            'sertificate',
          idpClientId: 'id',
          apiCertificate:
            'testsertificate==',
          ucpUrl: 'https://123.12.123.1:1234',
          provider: 'provider-1',
          region: 'region-eu',
        },
      ],
      sshKeys: [],
      credentials: [{}],
    },
  ],
};

export const mockExtCloud2 = {
  cloud: {
    id_token:
      'id-token-1',
    expires_in: 100,
    refresh_token:
      'refresh-token-1',
    refresh_expires_in: 200,
    idpClientId: null,
    username: 'anotheruser@test.com',
    cloudUrl: 'https://cloud-url-2.com',
    name: 'Container name 2',
    syncAll: false,
    syncedNamespaces: [],
  },
  loading: false,
  namespaces: [
    {
      name: 'namespaces-1',
      clusters: [],
      sshKeys: [],
      credentials: [{}],
    },
    {
      name: 'namespaces-2',
      clusters: [
        {
          id: 'id-2',
          name: 'name-2',
          namespace: 'namespaces-2',
          created: '2020-20-20',
          deleteInProgress: false,
          isManagementCluster: false,
          ready: true,
          serverUrl: 'https://123.12.12.12:123',
          idpIssuerUrl:
            'https://isseu-url.com',
          idpCertificate:
            'sertificate',
          idpClientId: 'id',
          apiCertificate:
            'testsertificate==',
          ucpUrl: 'https://123.12.123.1:1234',
          provider: 'provider-1',
          region: 'region-eu',
        },
      ],
      sshKeys: [],
      credentials: [{}],
    },
    {
      name: 'namespaces-3',
      clusters: [
        {
          id: 'id-3',
          name: 'name-3',
          namespace: 'namespaces-3',
          created: '2020-20-20',
          deleteInProgress: false,
          isManagementCluster: false,
          ready: true,
          serverUrl: 'https://123.12.12.12:123',
          idpIssuerUrl:
            'https://isseu-url.com',
          idpCertificate:
            'sertificate',
          idpClientId: 'id',
          apiCertificate:
            'testsertificate==',
          ucpUrl: 'https://123.12.123.1:1234',
          provider: 'provider-1',
          region: 'region-eu',
        },
      ],
      sshKeys: [],
      credentials: [{}],
    },
  ],
};

export const mockedExtendedClouds = {
  'https://cloud-url.com': mockExtCloud,
  'https://cloud-url-2.com': mockExtCloud2,
}
