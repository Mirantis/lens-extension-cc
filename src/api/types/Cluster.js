import * as rtv from 'rtvjs';
import { get, merge } from 'lodash';
import { Common } from '@k8slens/extensions';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { Resource, resourceTs } from './Resource';
import { Namespace } from './Namespace';
import { Credential } from './Credential';
import { SshKey } from './SshKey';
import { Proxy } from './Proxy';
import { License } from './License';
import { clusterEntityPhases } from '../../catalog/catalogEntities';
import { apiKinds } from '../apiConstants';
import { logValue } from '../../util/logger';
import { mkKubeConfig } from '../../util/templates';

const {
  Catalog: { KubernetesCluster },
} = Common;

const isManagementCluster = function (data) {
  const kaas = get(data.spec, 'providerSpec.value.kaas', {});
  return get(kaas, 'management.enabled', false) && !!get(kaas, 'regional');
};

const getServerUrl = function (data) {
  const ip = data.status.providerStatus.loadBalancerHost;
  return `https://${ip}:443`;
};

/**
 * Typeset for an MCC Cluster API resource.
 */
export const clusterTs = mergeRtvShapes({}, resourceTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Credential` class instance

  kind: [rtv.STRING, { oneOf: apiKinds.CLUSTER }],
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
  // NOTE: BYO clusters don't have status at all, or at least may not have it
  status: [
    rtv.OPTIONAL,
    {
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
  ],
});

/**
 * MCC cluster API resource.
 * @class Cluster
 */
export class Cluster extends Resource {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.data Raw data payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {Cloud} params.cloud Reference to the Cloud used to get the data.
   */
  constructor({ data, namespace, cloud }) {
    super({ data, cloud, typeset: clusterTs });

    // just testing for what is Cluster-specific
    DEV_ENV &&
      rtv.verify(
        { namespace },
        {
          namespace: [rtv.CLASS_OBJECT, { ctor: Namespace }],
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
        DEV_ENV &&
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
        DEV_ENV &&
          rtv.verify(
            { credential: newValue },
            {
              credential: [
                rtv.EXPECTED,
                rtv.CLASS_OBJECT,
                { ctor: Credential },
              ],
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
        DEV_ENV &&
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
        DEV_ENV &&
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

    /** @member {boolean} isManagementCluster */
    Object.defineProperty(this, 'isManagementCluster', {
      enumerable: true,
      get() {
        return isManagementCluster(data);
      },
    });

    /** @member {boolean} ready */
    Object.defineProperty(this, 'ready', {
      enumerable: true,
      get() {
        // NOTE: cluster is ready/provisioned (and we can generate a kubeConfig for it) if
        //  these fields are all available and defined, and cluster isn't being deleted
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

    /** @member {string|null} serverUrl */
    Object.defineProperty(this, 'serverUrl', {
      enumerable: true,
      get() {
        return this.ready ? getServerUrl(data) : null;
      },
    });

    /**
     * IDP Certificate Authority Data (OIDC)
     * @member {string|null} idpIssuerUrl
     */
    Object.defineProperty(this, 'idpIssuerUrl', {
      enumerable: true,
      get() {
        return this.ready ? data.status.providerStatus.oidc.issuerUrl : null;
      },
    });

    /** @member {string|null} idpCertificate */
    Object.defineProperty(this, 'idpCertificate', {
      enumerable: true,
      get() {
        return this.ready ? data.status.providerStatus.oidc.certificate : null;
      },
    });

    /** @member {string|null} idpClientId */
    Object.defineProperty(this, 'idpClientId', {
      enumerable: true,
      get() {
        return this.ready ? data.status.providerStatus.oidc.clientId : null;
      },
    });

    /** @member {string|null} apiCertificate */
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
     * @member {string|null} ucpUrl
     */
    Object.defineProperty(this, 'ucpUrl', {
      enumerable: true,
      get() {
        return this.ready ? data.status.providerStatus.ucpDashboard : null;
      },
    });

    /**
     * e.g. 'region-one'
     * @member {string|null} provider
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
     * @member {string|null} region
     */
    Object.defineProperty(this, 'region', {
      enumerable: true,
      get() {
        return this.ready
          ? get(data.metadata, 'labels["kaas.mirantis.com/region"]', null)
          : null;
      },
    });

    /** @member {sting|null} awsRegion */
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
    return `${this.cloud.username}@${this.namespace.name}@${this.name}`;
  }

  /**
   * Generates a kube config object for this cluster.
   * @returns {Object} Kube config for this cluster, as JSON.
   */
  getKubeConfig() {
    return mkKubeConfig({
      cluster: this,
      username: this.cloud.username,
    });
  }

  /**
   * Converts this API Object into a Catalog Entity Model.
   * @param {string} kubeconfigPath Path to the cluster's kube config file.
   * @returns {{ metadata: Object, spec: Object, status: Object }} Catalog Entity Model
   *  (use to create new Catalog Entity).
   * @override
   */
  toModel(kubeconfigPath) {
    const model = super.toModel();

    DEV_ENV && rtv.verify({ kubeconfigPath }, { kubeconfigPath: rtv.STRING });

    // NOTE: only add a label if it should be there; add a label to the object
    //  and giving it a value of `undefined` will result in the entity getting
    //  a label with a value of "undefined" (rather than ignoring it)
    const labels = {};
    if (!this.isManagementCluster) {
      labels.managementCluster = this.cloud.name;
      labels.project = this.namespace.name;

      if (this.sshKey) {
        labels.sshKey = this.sshKey.name;
      }

      if (this.credential) {
        labels.credential = this.credential.name;
      }

      if (this.proxy) {
        labels.proxy = this.proxy.name;
      }

      if (this.license) {
        labels.license = this.license.name;
      }
    }

    return merge({}, model, {
      metadata: {
        namespace: this.namespace.name,
        labels,
      },
      spec: {
        kubeconfigPath,
        kubeconfigContext: this.contextName, // must be same context name used in file
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

  /**
   * Converts this API Object into a Catalog Entity that can be inserted into a Catalog Source.
   * @param {string} kubeconfigPath Path to the kube config file the entity will use.
   * @returns {Common.Catalog.KubernetesCluster}
   */
  toEntity(kubeconfigPath) {
    return new KubernetesCluster(this.toModel(kubeconfigPath));
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, ready: ${
      this.ready
    }, region: ${logValue(this.region)}`;

    if (Object.getPrototypeOf(this).constructor === Cluster) {
      return `{Cluster ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
