import rtv from 'rtvjs';
import { get } from 'lodash';

const isManagementCluster = function (data) {
  const kaas = get(data.spec, 'providerSpec.value.kaas', {});
  return get(kaas, 'management.enabled', false) && !!get(kaas, 'regional');
};

const getServerUrl = function (data) {
  const ip = get(data.status, 'loadBalancerHost');
  return ip ? `https://${ip}:443` : null;
};

/**
 * MCC cluster.
 * @class Cluster
 * @param {Object} data Raw cluster data payload from the API.
 */
export class Cluster {
  constructor(data) {
    rtv.verify(
      { data },
      {
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

    /** @member {string} */
    this.id = data.metadata.uid;

    /** @member {string} */
    this.name = data.metadata.name;

    /** @member {string} */
    this.namespace = data.metadata.namespace;

    /** @member {Date} */
    this.created = new Date(data.metadata.creationTimestamp);

    /** @member {boolean} */
    this.isManagementCluster = isManagementCluster(data);

    /** @member {string|null} */
    this.serverUrl = getServerUrl(data);

    /** @member {string} */
    this.idpIssuerUrl = data.status.providerStatus.oidc.issuerUrl; // IDP Certificate Authority Data (OIDC)

    /** @member {string} */ this.idpCertificate =
      data.status.providerStatus.oidc.certificate;

    /** @member {string} */
    this.idpClientId = data.status.providerStatus.oidc.clientId;

    /** @member {} */
    this.apiCertificate = data.status.providerStatus.apiServerCertificate;

    /** @member {boolean} */
    this.deleteInProgress = !!data.metadata.deletionTimestamp;

    /** @member {string|null} */
    this.ucpUrl = data.status.providerStatus.ucpDashboard || null; // e.g. 'aws'

    /** @member {string|null} */ this.provider = get(
      data.metadata,
      'labels["kaas.mirantis.com/provider"]',
      null
    ); // e.g. 'east'

    /** @member {string|null} */ this.region = get(
      data.metadata,
      'labels["kaas.mirantis.com/region"]',
      null
    ); // e.g. 'us-west-2'

    /** @member {sting|null} */ this.awsRegion =
      data.spec.providerSpec.region || null;
  }
}
