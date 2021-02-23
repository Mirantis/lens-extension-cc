"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Cluster = void 0;

var _get2 = _interopRequireDefault(require("lodash/get"));

var rtv = _interopRequireWildcard(require("rtvjs"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const isManagementCluster = function (data) {
  const kaas = (0, _get2.default)(data.spec, 'providerSpec.value.kaas', {});
  return (0, _get2.default)(kaas, 'management.enabled', false) && !!(0, _get2.default)(kaas, 'regional');
};

const getServerUrl = function (data) {
  const ip = data.status.providerStatus.loadBalancerHost;
  return `https://${ip}:443`;
};
/**
 * MCC cluster.
 * @class Cluster
 * @param {Object} data Raw cluster data payload from the API.
 */


class Cluster {
  constructor(data) {
    DEV_ENV && rtv.verify({
      data
    }, {
      data: {
        metadata: {
          name: rtv.STRING,
          namespace: rtv.STRING,
          uid: rtv.STRING,
          creationTimestamp: rtv.STRING,
          // ISO8601 timestamp
          deletionTimestamp: [rtv.OPTIONAL, rtv.STRING],
          // ISO8601 timestamp; only exists if being deleted
          labels: [rtv.OPTIONAL, {
            'kaas.mirantis.com/provider': [rtv.OPTIONAL, rtv.STRING],
            'kaas.mirantis.com/region': [rtv.OPTIONAL, rtv.STRING]
          }]
        },
        spec: {
          providerSpec: {
            value: {
              kaas: [rtv.OPTIONAL, {
                management: [rtv.OPTIONAL, {
                  enabled: rtv.BOOLEAN
                }],
                regional: [rtv.OPTIONAL, rtv.ARRAY]
              }],
              region: [rtv.OPTIONAL, rtv.STRING]
            }
          }
        },
        status: {
          providerStatus: {
            oidc: {
              certificate: rtv.STRING,
              clientId: rtv.STRING,
              groupsClaim: rtv.STRING,
              issuerUrl: rtv.STRING,
              ready: rtv.BOOLEAN
            },
            apiServerCertificate: rtv.STRING,
            ucpDashboard: [rtv.OPTIONAL, rtv.STRING],
            // if managed by UCP, the URL
            loadBalancerHost: [rtv.OPTIONAL, rtv.STRING]
          }
        }
      }
    }); // NOTE: regardless of `ready`, we assume `data.metadata` is always available

    /** @member {string} */

    this.id = data.metadata.uid;
    /** @member {string} */

    this.name = data.metadata.name;
    /** @member {string} */

    this.namespace = data.metadata.namespace;
    /** @member {Date} */

    this.created = new Date(data.metadata.creationTimestamp);
    /** @member {boolean|null} */

    this.deleteInProgress = !!data.metadata.deletionTimestamp;
    /** @member {boolean} */

    this.isManagementCluster = isManagementCluster(data); // NOTE: cluster is ready/provisioned (and we can generate a kubeConfig for it) if
    //  these fields are all available and defined, and cluster isn't being deleted

    this.ready = !!(!this.deleteInProgress && data.status?.providerStatus?.loadBalancerHost && data.status?.providerStatus?.apiServerCertificate && data.status?.providerStatus?.oidc?.certificate && data.status?.providerStatus?.oidc?.clientId && data.status?.providerStatus?.oidc?.ready);
    /** @member {string|null} */

    this.serverUrl = this.ready ? getServerUrl(data) : null;
    /**
     * IDP Certificate Authority Data (OIDC)
     * @member {string|null}
     */

    this.idpIssuerUrl = this.ready ? data.status.providerStatus.oidc.issuerUrl : null;
    /** @member {string|null} */

    this.idpCertificate = this.ready ? data.status.providerStatus.oidc.certificate : null;
    /** @member {string|null} */

    this.idpClientId = this.ready ? data.status.providerStatus.oidc.clientId : null;
    /** @member {string|null} */

    this.apiCertificate = this.ready ? data.status.providerStatus.apiServerCertificate : null;
    /**
     * e.g. 'aws'
     * @member {string|null}
     */

    this.ucpUrl = this.ready ? data.status.providerStatus.ucpDashboard : null;
    /**
     * e.g. 'region-one'
     * @member {string|null}
     */

    this.provider = this.ready ? (0, _get2.default)(data.metadata, 'labels["kaas.mirantis.com/provider"]', null) : null;
    /**
     * e.g. 'us-west-2'
     * @member {string|null}
     */

    this.region = this.ready ? (0, _get2.default)(data.metadata, 'labels["kaas.mirantis.com/region"]', null) : null;
    /** @member {sting|null} */

    this.awsRegion = this.ready ? data.spec.providerSpec.region : null;
  }

}

exports.Cluster = Cluster;