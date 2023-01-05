import * as rtv from 'rtvjs';
import { get, merge } from 'lodash';
import { Common } from '@k8slens/extensions';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { Node, nodeTs } from './Node';
import {
  entityLabels,
  clusterEntityPhases,
} from '../../catalog/catalogEntities';
import { apiKinds, apiLabels } from '../apiConstants';
import { nodeConditionTs } from '../apiTypesets';
import { logger, logValue } from '../../util/logger';
import { mkKubeConfig } from '../../util/templates';

const {
  Catalog: { KubernetesCluster },
} = Common;

const isMgmtCluster = function (data) {
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
export const clusterTs = mergeRtvShapes({}, nodeTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Cluster` class instance

  kind: [rtv.STRING, { oneOf: apiKinds.CLUSTER }],
  metadata: {
    labels: [
      rtv.OPTIONAL,
      {
        [apiLabels.KAAS_PROVIDER]: [rtv.OPTIONAL, rtv.STRING],
        [apiLabels.KAAS_REGION]: [rtv.OPTIONAL, rtv.STRING],
      },
    ],
  },
  spec: {
    providerSpec: {
      value: {
        // NOTE: the name of the RHEL license used by the cluster is found in every
        //  __machine__ used by the cluster, in each machine's
        // `spec.providerSpec.value.rhelLicense` property

        // name of the associated credential (one, even though prop name is plural), if any
        credentials: [rtv.OPTIONAL, rtv.STRING],

        // name of the associated SSH keys, if any
        publicKeys: [rtv.OPTIONAL, [{ name: rtv.STRING }]],

        // name of the associated proxy, if any
        proxy: [rtv.OPTIONAL, rtv.STRING],

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
        releaseRefs: {
          current: {
            version: rtv.STRING,
          },
        },

        // readiness conditions
        conditions: [[nodeConditionTs]],

        // helm chart status
        helm: {
          ready: rtv.BOOLEAN,
          releases: [
            rtv.OPTIONAL,
            {
              stacklight: {
                // yes, lower 'l'
                alerta: {
                  url: [rtv.OPTIONAL, rtv.STRING],
                },
                alertmanager: {
                  // yes, lower 'm'
                  url: [rtv.OPTIONAL, rtv.STRING],
                },
                grafana: {
                  url: [rtv.OPTIONAL, rtv.STRING],
                },
                kibana: {
                  url: [rtv.OPTIONAL, rtv.STRING],
                },
                prometheus: {
                  url: [rtv.OPTIONAL, rtv.STRING],
                },
                telemeterServer: {
                  url: [rtv.OPTIONAL, rtv.STRING],
                },
              },
            },
          ],
        },

        // overall readiness: true if all `conditions[*].ready` and `helm.ready` are true
        ready: rtv.BOOLEAN,

        // NOTE: unlike machines, there's no `status` property with a string that appears
        //  to summarize the readiness of the cluster
      },
    },
  ],
});

/**
 * MCC cluster API resource.
 * @class Cluster
 */
export class Cluster extends Node {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.data Raw data payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   *
   *  NOTE: The namespace is expected to already contain all known Credentials,
   *   SSH Keys, Proxies, Machines, and Licenses that this Cluster might reference.
   *
   * @param {Cloud} params.cloud Reference to the Cloud used to get the data.
   * @param {string|null} [params.licenseName] Name of the RHEL License used by
   *  this cluster (found on its machines).
   */
  constructor({ data, namespace, cloud }) {
    super({ data, cloud, namespace, typeset: clusterTs });

    let _controllers = [];
    let _workers = [];
    let _sshKeys = [];
    let _events = [];
    let _updates = [];
    let _credential = null;
    let _proxy = null;
    let _license = null;

    /**
     * @member {Array<Machine>} controllers Master node Machines used by this Cluster.
     *  Empty list if none.
     */
    Object.defineProperty(this, 'controllers', {
      enumerable: true,
      get() {
        return _controllers;
      },
    });

    /**
     * @member {Array<Machine>} workers Worker node Machines used by this Cluster.
     *  Empty list if none.
     */
    Object.defineProperty(this, 'workers', {
      enumerable: true,
      get() {
        return _workers;
      },
    });

    /**
     * @member {Array<SshKey>} sshKeys SSH keys used by this Cluster. Empty list if none.
     */
    Object.defineProperty(this, 'sshKeys', {
      enumerable: true,
      get() {
        return _sshKeys;
      },
    });

    /**
     * @member {Array<ClusterEvent>} events Events related to this cluster. Empty list if none.
     */
    Object.defineProperty(this, 'events', {
      enumerable: true,
      get() {
        return _events;
      },
    });

    /**
     * @member {Array<ClusterDeployment|ClusterUpgrade|MachineDeployment|MachineUpgrade>} updates
     *  Updates related to this cluster or its machines. Empty list if none.
     */
    Object.defineProperty(this, 'updates', {
      enumerable: true,
      get() {
        return _updates;
      },
    });

    /**
     * @member {Credential|null} credential Credential used by this Cluster. Null if none.
     */
    Object.defineProperty(this, 'credential', {
      enumerable: true,
      get() {
        return _credential;
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
    });

    /**
     * @member {License|null} license License used by this Cluster. Null if none.
     */
    Object.defineProperty(this, 'license', {
      enumerable: true,
      get() {
        return _license;
      },
    });

    /**
     * @readonly
     * @member {boolean} isMgmtCluster
     */
    Object.defineProperty(this, 'isMgmtCluster', {
      enumerable: true,
      get() {
        return isMgmtCluster(data);
      },
    });

    /**
     * @readonly
     * @member {sting|null} currentVersion
     */
    Object.defineProperty(this, 'currentVersion', {
      enumerable: true,
      get() {
        return data.status?.providerStatus?.releaseRefs.current.version || null;
      },
    });

    /**
     * True if this Cluster's providers are ready for use, which implies that
     *  the `data.status.providerStatus` property exists.
     *
     * @member {boolean} providerReady
     */
    Object.defineProperty(this, 'providerReady', {
      enumerable: true,
      get() {
        return !!data.status?.providerStatus?.ready;
      },
    });

    /**
     * True if this Cluster has all the data necessary to generate a kubeConfig for it.
     *
     * NOTE: It's possible for the Cluster to be config-ready, but not overall `ready`.
     *
     * @readonly
     * @member {boolean} configReady
     */
    Object.defineProperty(this, 'configReady', {
      enumerable: true,
      get() {
        // NOTE: cluster is ready/provisioned (and we can generate a kubeConfig for it) if
        //  these fields are all available and defined, and cluster isn't being deleted
        return !!(
          !this.deleteInProgress &&
          this.providerReady &&
          data.status.providerStatus.loadBalancerHost &&
          data.status.providerStatus.apiServerCertificate &&
          data.status.providerStatus.oidc?.ready &&
          data.status.providerStatus.oidc?.certificate &&
          data.status.providerStatus.oidc?.clientId
        );
      },
    });

    /**
     * @readonly
     * @member {string|null} serverUrl
     */
    Object.defineProperty(this, 'serverUrl', {
      enumerable: true,
      get() {
        return this.configReady ? getServerUrl(data) : null;
      },
    });

    /**
     * IDP Certificate Authority Data (OIDC)
     * @readonly
     * @member {string|null} idpIssuerUrl
     */
    Object.defineProperty(this, 'idpIssuerUrl', {
      enumerable: true,
      get() {
        return this.configReady
          ? data.status.providerStatus.oidc.issuerUrl
          : null;
      },
    });

    /**
     * @readonly
     * @member {string|null} idpCertificate
     */
    Object.defineProperty(this, 'idpCertificate', {
      enumerable: true,
      get() {
        return this.configReady
          ? data.status.providerStatus.oidc.certificate
          : null;
      },
    });

    /**
     * @readonly
     * @member {string|null} idpClientId
     */
    Object.defineProperty(this, 'idpClientId', {
      enumerable: true,
      get() {
        return this.configReady
          ? data.status.providerStatus.oidc.clientId
          : null;
      },
    });

    /**
     * @readonly
     * @member {string|null} apiCertificate
     */
    Object.defineProperty(this, 'apiCertificate', {
      enumerable: true,
      get() {
        return this.configReady
          ? data.status.providerStatus.apiServerCertificate
          : null;
      },
    });

    /**
     * URL to the MKE instance for the mgmt cluster, e.g. 'https://1.1.1.1:123'
     * @readonly
     * @member {string|null} dashboardUrl
     */
    Object.defineProperty(this, 'dashboardUrl', {
      enumerable: true,
      get() {
        return this.providerReady
          ? data.status.providerStatus.ucpDashboard
          : null;
      },
    });

    /**
     * Logging, Monitoring, and Alerting info, if ready.
     * @readonly
     * @member {{
     *   alertaUrl?: string,
     *   alertManagerUrl?: string,
     *   grafanaUrl?: string,
     *   kibanaUrl?: string,
     *   prometheusUrl?: string,
     *   telemeterServerUrl?: string,
     * }|null} lma
     */
    Object.defineProperty(this, 'lma', {
      enumerable: true,
      get() {
        if (
          this.providerReady &&
          data.status.providerStatus.helm?.ready &&
          data.status.providerStatus.helm?.releases?.stacklight
        ) {
          const { stacklight: stackLight = {} } =
            data.status.providerStatus.helm.releases;
          const lma = {
            alertaUrl: stackLight.alerta?.url || undefined,
            alertManagerUrl: stackLight.alertmanager?.url || undefined, // yes, different casing...
            grafanaUrl: stackLight.grafana?.url || undefined,
            kibanaUrl: stackLight.kibana?.url || undefined,
            prometheusUrl: stackLight.prometheus?.url || undefined,
            telemeterServerUrl: stackLight.telemeterServer?.url || undefined,
          };

          // when StackLight is disabled, we may still have the `stacklight` object, but we
          //  won't have any of the URLs (a property for each StackLight service, like
          //  'prometheus', will be fined, but mapped to an empty object instead of
          //  an object with a 'url' property; e.g. `prometheus: {}` instead of
          //  `prometheus: { url: 'https://...' }`
          // if we have at least one URL, assume LMA is enabled and return an object with
          //  any URLs we might have; otherwise, LMA is disabled, so return `null`
          return Object.entries(lma).find(([, value]) => !!value) ? lma : null;
        }

        return null;
      },
    });

    /**
     * @readonly
     * @member {sting|null} awsRegion
     */
    Object.defineProperty(this, 'awsRegion', {
      enumerable: true,
      get() {
        return this.configReady ? data.spec.providerSpec.region : null;
      },
    });

    //// Initialize

    // NOTE: if any of these warnings get logged, it's probably because the `namespace`
    //  given to the constructor isn't loaded yet with all other resource types

    data.spec.providerSpec.value.publicKeys?.forEach(({ name: keyName }) => {
      const sshKey = this.namespace.sshKeys.find((key) => key.name === keyName);
      if (sshKey) {
        _sshKeys.push(sshKey);
      } else {
        logger.warn(
          'Cluster.constructor()',
          `Unable to find ssh key name=${logValue(
            keyName
          )} for cluster=${logValue(this.name)}, namespace=${logValue(
            this.namespace.name
          )}, cloud=${logValue(this.cloud.cloudUrl)}`
        );
      }
    });

    if (data.spec.providerSpec.value.credentials) {
      const credName = data.spec.providerSpec.value.credentials;
      _credential =
        this.namespace.credentials.find((cr) => cr.name === credName) || null;
      if (!_credential) {
        logger.warn(
          'Cluster.constructor()',
          `Unable to find credential name=${logValue(
            credName
          )} for cluster=${logValue(this.name)}, namespace=${logValue(
            this.namespace.name
          )}, cloud=${logValue(this.cloud.cloudUrl)}`
        );
      }
    }

    if (data.spec.providerSpec.value.proxy) {
      const proxyName = data.spec.providerSpec.value.proxy;
      _proxy =
        this.namespace.proxies.find((pr) => pr.name === proxyName) || null;
      if (!_proxy) {
        logger.warn(
          'Cluster.constructor()',
          `Unable to find proxy name=${logValue(
            proxyName
          )} for cluster=${logValue(this.name)}, namespace=${logValue(
            this.namespace.name
          )}, cloud=${logValue(this.cloud.cloudUrl)}`
        );
      }
    }

    const allNames = [this.uid];

    this.namespace.machines.forEach((m) => {
      if (m.clusterName === this.name) {
        allNames.push(m.name);
        if (m.isController) {
          _controllers.push(m);
        } else {
          _workers.push(m);
        }
      }
    });

    if (_controllers.length + _workers.length <= 0) {
      logger.warn(
        'Cluster.constructor()',
        `Unable to find any machines for cluster=${logValue(
          this.name
        )}, namespace=${logValue(this.namespace.name)}, cloud=${logValue(
          this.cloud.cloudUrl
        )}`
      );
    } else {
      // look for the first machine that has a license, and assume that's the one
      //  the cluster is ultimately using (because we assume all machines use the
      //  same license)
      _license =
        [...this.controllers, ...this.workers].find((m) => !!m.license)
          ?.license || null;
    }

    // NOTE: must be done AFTER finding machines so we can also find the machine events
    //  for this cluster (if any)
    _events = this.namespace.events.filter((event) =>
      // NOTE: since namespace+name is universal, we can be confident that if we have a match
      //  (by the fact we're iterating only events in the same namespace as this cluster and
      //  matching the event's target name to the name of a cluster in said namespace), the
      //  related object will also be a ClusterEvent or MachineEvent instance
      // NOTE: for events, `event.targetUid` is NOT guaranteed to be available, but `targetName` is
      allNames.includes(event.targetName)
    );

    // NOTE: must be done AFTER finding machines so we can also find the machine updates
    //  for this cluster (if any)
    _updates = this.namespace.updates.filter((update) =>
      // NOTE: since namespace+name is universal, we can be confident that if we have a match
      //  (by the fact we're iterating only updates in the same namespace as this cluster and
      //  matching the update's target name to the name of a cluster in said namespace), the
      //  related object will also be a ClusterDeployment, ClusterUpgrade, MachineDeployment,
      //  or MachineUpgrade instance
      allNames.includes(update.targetName)
    );
  }

  /**
   * @readonly
   * @member {string} contextName Kubeconfig context name for this cluster.
   */
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

    // NOTE: only add a label if it should be there; adding a label to the object
    //  and giving it a value of `undefined` will result in the entity getting
    //  a label with a value of "undefined" (rather than ignoring it)
    const labels = {
      [entityLabels.CLOUD]: this.cloud.name,
      [entityLabels.NAMESPACE]: this.namespace.name,
    };

    if (this.isMgmtCluster) {
      labels[entityLabels.IS_MGMT_CLUSTER] = 'true';
    }

    if (this.sshKeys.length > 0) {
      // NOTE: this mostly works, but it's a __Lens issue__ that you then have to
      //  search for the combined string, and you can't find all clusters that have
      //  one or the other
      labels[entityLabels.SSH_KEY] = this.sshKeys
        .map(({ name }) => name)
        .join(',');
    }

    if (this.credential) {
      labels[entityLabels.CREDENTIAL] = this.credential.name;
    }

    if (this.proxy) {
      labels[entityLabels.PROXY] = this.proxy.name;
    }

    if (this.license) {
      labels[entityLabels.LICENSE] = this.license.name;
    }

    return merge({}, model, {
      metadata: {
        labels,
      },
      spec: {
        kubeconfigPath,
        kubeconfigContext: this.contextName, // must be same context name used in file
        isMgmtCluster: this.isMgmtCluster,
        controllerCount: this.controllers.length,
        workerCount: this.workers.length,
        currentVersion: this.currentVersion,
        dashboardUrl: this.dashboardUrl,
        lma: this.lma,
        events: this.events.map((e) => e.toModel()),
        updates: this.updates.map((u) => u.toModel()),
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
    const propStr = `${super.toString()}, ready: ${this.ready}, configReady: ${
      this.configReady
    }, sshKeys: ${logValue(
      this.sshKeys.map((key) => key.name)
    )}, events: ${logValue(this.events.length)}, updates: ${logValue(
      this.updates.length
    )}, credential: ${logValue(
      this.credential && this.credential.name
    )}, proxy: ${logValue(this.proxy && this.proxy.name)}, license: ${logValue(
      this.license && this.license.name
    )}`;

    if (Object.getPrototypeOf(this).constructor === Cluster) {
      return `{Cluster ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
