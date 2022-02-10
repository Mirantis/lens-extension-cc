import * as rtv from 'rtvjs';
import { get } from 'lodash';

const isManagementCluster = function (data) {
  const kaas = get(data.spec, 'providerSpec.value.kaas', {});
  return get(kaas, 'management.enabled', false) && !!get(kaas, 'regional');
};

const getServerUrl = function (data) {
  const ip = data.status.providerStatus.loadBalancerHost;
  return `https://${ip}:443`;
};

/**
 * MCC cluster.
 * @class Cluster
 * @param {Object} data Raw cluster data payload from the API.
 * @param {string} username Username used to access the cluster.
 */
export class Cluster {
  constructor(data, username) {
    DEV_ENV &&
      rtv.verify(
        { username, data },
        {
          username: rtv.STRING,
          data: {
            metadata: {
              name: rtv.STRING,
              namespace: rtv.STRING,
              uid: rtv.STRING,
              creationTimestamp: rtv.STRING, // ISO8601 timestamp
              deletionTimestamp: [rtv.OPTIONAL, rtv.STRING], // ISO8601 timestamp; only exists if being deleted
              labels: [
                rtv.OPTIONAL,
                {
                  'kaas.mirantis.com/provider': [rtv.OPTIONAL, rtv.STRING],
                  'kaas.mirantis.com/region': [rtv.OPTIONAL, rtv.STRING],
                },
              ],
            },
            spec: {
              providerSpec: {
                value: {
                  kaas: [
                    rtv.OPTIONAL,
                    {
                      management: [
                        rtv.OPTIONAL,
                        {
                          enabled: rtv.BOOLEAN,
                        },
                      ],
                      regional: [rtv.OPTIONAL, rtv.ARRAY],
                    },
                  ],
                  region: [rtv.OPTIONAL, rtv.STRING],
                },
              },
            },
            status: {
              providerStatus: {
                oidc: {
                  certificate: rtv.STRING,
                  clientId: rtv.STRING,
                  groupsClaim: rtv.STRING,
                  issuerUrl: rtv.STRING,
                  ready: rtv.BOOLEAN,
                },
                apiServerCertificate: rtv.STRING,
                ucpDashboard: [rtv.OPTIONAL, rtv.STRING], // if managed by UCP, the URL
                loadBalancerHost: [rtv.OPTIONAL, rtv.STRING],
              },
            },
          },
        }
      );

    // NOTE: regardless of `ready`, we assume `data.metadata` is always available

    /** @member {string} */
    this.username = username;

    /** @member {string} */
    this.id = data.metadata.uid;

    /** @member {string} */
    this.name = data.metadata.name;

    /** @member {string} */
    this.namespace = data.metadata.namespace;

    /** @member {Date} */
    this.creationDate = new Date(data.metadata.creationTimestamp);

    /** @member {boolean|null} */
    this.deleteInProgress = !!data.metadata.deletionTimestamp;

    /** @member {boolean} */
    this.isManagementCluster = isManagementCluster(data);

    // NOTE: cluster is ready/provisioned (and we can generate a kubeConfig for it) if
    //  these fields are all available and defined, and cluster isn't being deleted
    this.ready = !!(
      !this.deleteInProgress &&
      data.status?.providerStatus?.loadBalancerHost &&
      data.status?.providerStatus?.apiServerCertificate &&
      data.status?.providerStatus?.oidc?.certificate &&
      data.status?.providerStatus?.oidc?.clientId &&
      data.status?.providerStatus?.oidc?.ready
    );

    /** @member {string|null} */
    this.serverUrl = this.ready ? getServerUrl(data) : null;

    /**
     * IDP Certificate Authority Data (OIDC)
     * @member {string|null}
     */
    this.idpIssuerUrl = this.ready
      ? data.status.providerStatus.oidc.issuerUrl
      : null;

    /** @member {string|null} */
    this.idpCertificate = this.ready
      ? data.status.providerStatus.oidc.certificate
      : null;

    /** @member {string|null} */
    this.idpClientId = this.ready
      ? data.status.providerStatus.oidc.clientId
      : null;

    /** @member {string|null} */
    this.apiCertificate = this.ready
      ? data.status.providerStatus.apiServerCertificate
      : null;

    /**
     * e.g. 'aws'
     * @member {string|null}
     */
    this.ucpUrl = this.ready ? data.status.providerStatus.ucpDashboard : null;

    /**
     * e.g. 'region-one'
     * @member {string|null}
     */
    this.provider = this.ready
      ? get(data.metadata, 'labels["kaas.mirantis.com/provider"]', null)
      : null;

    /**
     * e.g. 'us-west-2'
     * @member {string|null}
     */
    this.region = this.ready
      ? get(data.metadata, 'labels["kaas.mirantis.com/region"]', null)
      : null;

    /** @member {sting|null} */
    this.awsRegion = this.ready ? data.spec.providerSpec.region : null;
  }

  /** @member {string} contextName Kubeconfig context name for this cluster. */
  get contextName() {
    // NOTE: this mirrors how MCC generates kubeconfig context names
    return `${this.username}@${this.namespace}@${this.name}`;
  }
}
