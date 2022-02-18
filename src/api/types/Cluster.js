import * as rtv from 'rtvjs';
import { get, merge } from 'lodash';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { ApiObject, apiObjectTs } from './ApiObject';
import { Namespace } from './Namespace';
import { Credential } from './Credential';
import { SshKey } from './SshKey';
import { Proxy } from './Proxy';
import { License } from './License';
import { clusterEntityPhases } from '../../catalog/catalogEntities';

const isManagementCluster = function (data) {
  const kaas = get(data.spec, 'providerSpec.value.kaas', {});
  return get(kaas, 'management.enabled', false) && !!get(kaas, 'regional');
};

const getServerUrl = function (data) {
  const ip = data.status.providerStatus.loadBalancerHost;
  return `https://${ip}:443`;
};

/**
 * Typeset for an MCC Cluster object.
 */
export const apiClusterTs = mergeRtvShapes({}, apiObjectTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Credential` class instance

  metadata: {
    labels: [
      rtv.OPTIONAL,
      {
        // if we have labels, these are important
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
});

/**
 * MCC cluster.
 * @class Cluster
 */
export class Cluster extends ApiObject {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.data Raw data payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {Cloud} params.cloud Reference to the Cloud used to get the data.
   * @param {string} params.username Username used to access the Cloud.
   */
  constructor({ data, namespace, cloud, username }) {
    super({ data, cloud });

    // just testing for what is Cluster-specific
    DEV_ENV &&
      rtv.verify(
        { data, namespace },
        {
          namespace: [rtv.CLASS_OBJECT, { ctor: Namespace }],
          data: apiClusterTs,
        }
      );

    // NOTE: regardless of `ready`, we assume `data.metadata` is always available

    let _sshKey = null;
    let _credential = null;
    let _proxy = null;
    let _license = null;

    /** @member {Namespace} */
    Object.defineProperty(this, 'namespace', {
      enumerable: true,
      get() {
        return namespace;
      },
    });

    /**
     * @member {SshKey|null} sshKey SSH key used by this Cluster. Null if none.
     */
    Object.defineProperty(this, 'sshKey', {
      enumerable: true,
      get() {
        return _sshKey;
      },
      set(newValue) {
        rtv.verify(
          { sshKey: newValue },
          { sshKey: [rtv.EXPECTED, rtv.CLASS_OBJECT, { ctor: SshKey }] }
        );
        if (newValue !== _sshKey) {
          _sshKey = newValue || null;
        }
      },
    });

    /**
     * @param {Credential|null} credential Credential used by this Cluster. Null if none.
     */
    Object.defineProperty(this, 'credential', {
      enumerable: true,
      get() {
        return _credential;
      },
      set(newValue) {
        rtv.verify(
          { credential: newValue },
          {
            credential: [rtv.EXPECTED, rtv.CLASS_OBJECT, { ctor: Credential }],
          }
        );
        if (newValue !== _credential) {
          _credential = newValue || null;
        }
      },
    });

    /**
     * @member {Proxy|null} proxy Proxy used by this Cluster. Null if none.
     */
    Object.defineProperty(this, 'proxy', {
      enumerable: true,
      get() {
        return _proxy;
      },
      set(newValue) {
        rtv.verify(
          { proxy: newValue },
          {
            proxy: [rtv.EXPECTED, rtv.CLASS_OBJECT, { ctor: Proxy }],
          }
        );
        if (newValue !== _proxy) {
          _proxy = newValue || null;
        }
      },
    });

    /**
     * @member {License|null} license License used by this Cluster. Null if none.
     */
    Object.defineProperty(this, 'license', {
      enumerable: true,
      get() {
        return _license;
      },
      set(newValue) {
        rtv.verify(
          { license: newValue },
          {
            license: [rtv.EXPECTED, rtv.CLASS_OBJECT, { ctor: License }],
          }
        );
        if (newValue !== _license) {
          _license = newValue || null;
        }
      },
    });

    /** @member {string} */
    Object.defineProperty(this, 'username', {
      enumerable: true,
      get() {
        return username;
      },
    });

    /** @member {boolean} */
    Object.defineProperty(this, 'isManagementCluster', {
      enumerable: true,
      get() {
        return isManagementCluster(data);
      },
    });

    // NOTE: cluster is ready/provisioned (and we can generate a kubeConfig for it) if
    //  these fields are all available and defined, and cluster isn't being deleted
    Object.defineProperty(this, 'ready', {
      enumerable: true,
      get() {
        return !!(
          !this.deleteInProgress &&
          data.status?.providerStatus?.loadBalancerHost &&
          data.status?.providerStatus?.apiServerCertificate &&
          data.status?.providerStatus?.oidc?.certificate &&
          data.status?.providerStatus?.oidc?.clientId &&
          data.status?.providerStatus?.oidc?.ready
        );
      },
    });

    /** @member {string|null} */
    Object.defineProperty(this, 'serverUrl', {
      enumerable: true,
      get() {
        return this.ready ? getServerUrl(data) : null;
      },
    });

    /**
     * IDP Certificate Authority Data (OIDC)
     * @member {string|null}
     */
    Object.defineProperty(this, 'idpIssuerUrl', {
      enumerable: true,
      get() {
        return this.ready ? data.status.providerStatus.oidc.issuerUrl : null;
      },
    });

    /** @member {string|null} */
    Object.defineProperty(this, 'idpCertificate', {
      enumerable: true,
      get() {
        return this.ready ? data.status.providerStatus.oidc.certificate : null;
      },
    });

    /** @member {string|null} */
    Object.defineProperty(this, 'idpClientId', {
      enumerable: true,
      get() {
        return this.ready ? data.status.providerStatus.oidc.clientId : null;
      },
    });

    /** @member {string|null} */
    Object.defineProperty(this, 'apiCertificate', {
      enumerable: true,
      get() {
        return this.ready
          ? data.status.providerStatus.apiServerCertificate
          : null;
      },
    });

    /**
     * e.g. 'aws'
     * @member {string|null}
     */
    Object.defineProperty(this, 'ucpUrl', {
      enumerable: true,
      get() {
        return this.ready ? data.status.providerStatus.ucpDashboard : null;
      },
    });

    /**
     * e.g. 'region-one'
     * @member {string|null}
     */
    Object.defineProperty(this, 'provider', {
      enumerable: true,
      get() {
        return this.ready
          ? get(data.metadata, 'labels["kaas.mirantis.com/provider"]', null)
          : null;
      },
    });

    /**
     * e.g. 'us-west-2'
     * @member {string|null}
     */
    Object.defineProperty(this, 'region', {
      enumerable: true,
      get() {
        return this.ready
          ? get(data.metadata, 'labels["kaas.mirantis.com/region"]', null)
          : null;
      },
    });

    /** @member {sting|null} */
    Object.defineProperty(this, 'awsRegion', {
      enumerable: true,
      get() {
        return this.ready ? data.spec.providerSpec.region : null;
      },
    });
  }

  /** @member {string} contextName Kubeconfig context name for this cluster. */
  get contextName() {
    // NOTE: this mirrors how MCC generates kubeconfig context names
    return `${this.username}@${this.namespace.name}@${this.name}`;
  }

  /**
   * Converts this API Object into a Catalog Entity.
   * @returns {Object} Entity object.
   * @override
   */
  toEntity() {
    const entity = super.toEntity();

    return merge({}, entity, {
      metadata: {
        labels: {
          ...(this.isManagementCluster
            ? {}
            : {
                managementCluster: this.cloud.name,
                project: this.namespace.name,
                sshKey: this.sshKey?.name || undefined,
                credential: this.credential?.name || undefined,
                proxy: this.proxy?.name || undefined,
                license: this.license?.name || undefined,
              }),
        },
      },
      spec: {
        kubeconfigPath: 'wip', // TODO[PRODX-21909]
        kubeconfigContext: 'wip', // TODO[PRODX-21909]
        isManagementCluster: this.isManagementCluster,
        ready: this.ready,
      },
      status: {
        // always starts off disconnected as far as Lens is concerned (because it
        //  hasn't loaded it yet; Lens will update this value when the user opens
        //  the cluster)
        phase: clusterEntityPhases.DISCONNECTED,
      },
    });
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, ready: ${this.ready}, region: ${
      typeof this.region === 'string' ? `"${this.region}"` : this.region
    }`;

    if (Object.getPrototypeOf(this).constructor === Cluster) {
      return `{Cluster ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
