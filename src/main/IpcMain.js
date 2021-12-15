//
// Main Process IPC API
//

import { promises as fs } from 'fs';
import { observable } from 'mobx';
import { Main, Common } from '@k8slens/extensions';
import * as rtv from 'rtvjs';
import {
  clusterModelTs,
  sshKeyModelTs,
  credentialModelTs,
  proxyModelTs,
} from '../typesets';
import { clusterStore } from '../store/ClusterStore';
import { logger } from '../util/logger';
import { ipcEvents } from '../constants';
import { SshKeyEntity } from '../catalog/SshKeyEntity';
import { CredentialEntity } from '../catalog/CredentialEntity';
import { ProxyEntity } from '../catalog/ProxyEntity';
import * as consts from '../constants';

const {
  Catalog: { KubernetesCluster },
} = Common;

// typeset for the capture() method
const captureTs = {
  level: [rtv.STRING, { oneOf: Object.keys(console) }],
  context: rtv.STRING,
  message: rtv.STRING,
};

export const catalogSource = observable.array([]);

export class IpcMain extends Main.Ipc {
  //
  // HANDLERS
  //

  /**
   * Adds specified clusters to the Catalog.
   * @param {string} event Identifier provided by Lens.
   * @param {Array<ClusterModel>} models Cluster models to use to add clusters to the Catalog
   *  as new `Common.Catalog.KubernetesCluster` objects.
   */
  onAddClusters = (event, models) => {
    this.addClusters(models);
    this.capture(
      'log',
      'onAddClusters()',
      `Added ${
        models.length
      } clusters to catalog and clusterStore, clusters=[${models
        .map((model) => model.metadata.uid)
        .join(', ')}]`
    );
    this.broadcast(
      ipcEvents.broadcast.CLUSTERS_ADDED,
      models.map((model) => model.metadata.uid)
    );
  };

  /**
   * Removes a cluster from the Catalog without removing the cluster's kubeConfig from disk.
   * @param {string} event Identifier provided by Lens.
   * @param {string} clusterId ID of the cluster to remove.
   */
  onRemoveCluster = (event, clusterId) => {
    DEV_ENV && rtv.verify({ clusterId }, { clusterId: rtv.STRING });

    if (this.removeCluster(clusterId)) {
      this.capture(
        'log',
        'onRemoveCluster()',
        `Removed cluster ${clusterId} from catalog and clusterStore, kubeConfig file untouched`
      );
      this.broadcast(ipcEvents.broadcast.CLUSTERS_REMOVED, [clusterId]);
    }
  };

  /**
   * [ASYNC] Removes a cluster from the Catalog AND removes the cluster's kubeConfig from disk.
   * @param {string} event Identifier provided by Lens.
   * @param {string} clusterId ID of the cluster to delete.
   */
  onDeleteCluster = async (event, clusterId) => {
    DEV_ENV && rtv.verify({ clusterId }, { clusterId: rtv.STRING });

    const model = clusterStore.models.find((m) => m.metadata.uid === clusterId);
    let removed = this.removeCluster(clusterId);

    if (model) {
      try {
        const stats = await fs.stat(model.spec.kubeconfigPath);
        if (stats.isFile()) {
          await fs.unlink(model.spec.kubeconfigPath);
          this.capture(
            'log',
            'onDeleteCluster()',
            `Cluster kubeConfig file deleted, clusterId=${clusterId}, path=${model.spec.kubeconfigPath}`
          );
          removed = true;
        }
      } catch (err) {
        this.capture(
          'error',
          'onDeleteCluster()',
          `Failed to delete kubeConfig file, clusterId=${clusterId}, error="${err.message}"`
        );
      }
    }

    if (removed) {
      this.capture(
        'log',
        'onDeleteCluster()',
        `Removed cluster ${clusterId} from catalog and clusterStore, kubeConfig file deleted`
      );
      this.broadcast(ipcEvents.broadcast.CLUSTERS_REMOVED, [clusterId]);
    }
  };

  //
  // SINGLETON
  //

  /**
   * @param {Main.LensExtension} extension
   */
  constructor(extension) {
    super(extension);

    extension.addCatalogSource(consts.catalog.source, catalogSource);
    this.restoreClusters();

    this.handle(ipcEvents.invoke.ADD_CLUSTERS, this.onAddClusters);
    this.handle(ipcEvents.invoke.REMOVE_CLUSTER, this.onRemoveCluster);
    this.handle(ipcEvents.invoke.DELETE_CLUSTER, this.onDeleteCluster);
  }

  /**
   * Logs a message to the `logger` and broadcasts it to the Renderer.
   * @param {string} level Logger/console method, e.g. 'log' or 'warn'.
   * @param {string} context Identifies where the message came from, e.g. 'methodName()'.
   *  The prefix "IpcMain." is added to this string.
   * @param {string} message Log message.
   * @param {...any} rest Anything else to pass to the Logger to be printed as data
   *  or parsed with '%s' placeholders in the message (same as `console` API).
   */
  capture(level, context, message, ...rest) {
    DEV_ENV && rtv.verify({ level, context, message }, captureTs);

    const params = [`IpcMain.${context}`, message, ...rest];
    logger[level](...params);
    this.broadcast(ipcEvents.broadcast.LOGGER, level, ...params);
  }

  /**
   * Restores clusters from the `clusterStore` to the `catalogSource`.
   */
  restoreClusters() {
    this.addClusters(clusterStore.models, false);
    this.capture(
      'log',
      'restoreClusters()',
      `Restored ${
        clusterStore.models.length
      } clusters from clusterStore into catalog, clusters=[${clusterStore.models
        .map((model) => model.metadata.uid)
        .join(', ')}]`
    );
  }

  /**
   * Adds clusters to the `catalogSource`.
   * @param {Array<ClusterModel>} models Cluster models to add.
   * @param {boolean} [persist] If false, models will not be persisted to the store.
   */
  addClusters(models, persist = true) {
    DEV_ENV && rtv.verify({ models }, { models: [[clusterModelTs]] });

    models.forEach((model) => {
      // officially add to Lens
      this.capture(
        'log',
        'addClusters()',
        `adding cluster to catalog, clusterId=${model.metadata.uid}, name=${model.metadata.name}, namespace=${model.metadata.namespace}`
      );
      catalogSource.push(new KubernetesCluster(model));
      if (persist) {
        clusterStore.models.push(model);
      }
    });
  }

  /**
   * Removes the cluster from the `catalogSource` and `clusterStore`, if found.
   * @param {string} clusterId ID of the cluster to remove.
   * @returns {boolean} True if the cluster was removed from at least one of the two;
   *  false if it didn't exist anywhere.
   */
  removeCluster(clusterId) {
    let removed = false;

    const clusterIdx = catalogSource.findIndex(
      (kc) => kc.metadata.uid === clusterId
    );
    if (clusterIdx >= 0) {
      catalogSource.splice(clusterIdx, 1);
      removed = true;
      this.capture(
        'log',
        'removeCluster()',
        `Removed cluster from catalog, clusterId=${clusterId}`
      );
    }

    const modelIdx = clusterStore.models.findIndex(
      (model) => model.metadata.uid === clusterId
    );
    if (modelIdx >= 0) {
      clusterStore.models.splice(modelIdx, 1);
      removed = true;
      this.capture(
        'log',
        'removeCluster()',
        `Removed cluster from clusterStore, clusterId=${clusterId}`
      );
    }

    return removed;
  }

  /**
   * Adds fake/dummy items to the Catalog for testing.
   */
  addFakeItems() {
    if (!DEV_ENV) {
      return;
    }

    //// SSH KEYS

    const sshKeyModels = [
      {
        metadata: {
          source: consts.catalog.source,
          uid: 'sshkey-uid-1',
          name: 'SSH Key 1',
          namespace: 'lex-ns-1',
          cloudUrl: 'https://container-cloud.acme.com',
        },
        spec: {
          publicKey: 'sshkey-public-key-1',
        },
        status: {
          phase: 'available',
        },
      },
      {
        metadata: {
          source: consts.catalog.source,
          uid: 'sshkey-uid-2',
          name: 'SSH Key 2',
          namespace: 'lex-ns-2',
          cloudUrl: 'https://container-cloud.acme.com',
        },
        spec: {
          publicKey: 'sshkey-public-key-2',
        },
        status: {
          phase: 'available',
        },
      },
    ];

    DEV_ENV && rtv.verify(sshKeyModels, [[sshKeyModelTs]]);

    sshKeyModels.forEach((model) => {
      this.capture(
        'log',
        'addFakeItems()',
        `adding ssh key to catalog, keyId=${model.metadata.uid}, name=${model.metadata.name}, namespace=${model.metadata.namespace}`
      );
      catalogSource.push(new SshKeyEntity(model));
    });

    //// CREDENTIALS

    const credentialModels = [
      {
        metadata: {
          source: consts.catalog.source,
          uid: 'credential-uid-1',
          name: 'Credential 1',
          namespace: 'lex-ns-1',
          cloudUrl: 'https://container-cloud.acme.com',
        },
        spec: {
          provider: 'aws',
          status: {
            valid: true,
          },
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
        },
        spec: {
          provider: 'openstack',
          status: {
            valid: false,
          },
        },
        status: {
          phase: 'available',
        },
      },
    ];

    DEV_ENV && rtv.verify(credentialModels, [[credentialModelTs]]);

    credentialModels.forEach((model) => {
      this.capture(
        'log',
        'addFakeItems()',
        `adding credential to catalog, keyId=${model.metadata.uid}, name=${model.metadata.name}, namespace=${model.metadata.namespace}`
      );
      catalogSource.push(new CredentialEntity(model));
    });

    //// PROXIES

    const proxyModels = [
      {
        metadata: {
          source: consts.catalog.source,
          uid: 'proxy-uid-1',
          name: 'Proxy 1',
          namespace: 'lex-ns-1',
          cloudUrl: 'https://container-cloud.acme.com',
        },
        spec: {
          region: 'aws-us-east-1',
          http: 'http://east.proxy.com',
          https: 'https://east.proxy.com',
        },
        status: {
          phase: 'available',
        },
      },
      {
        metadata: {
          source: consts.catalog.source,
          uid: 'proxy-uid-2',
          name: 'Proxy 2',
          namespace: 'lex-ns-2',
          cloudUrl: 'https://container-cloud.acme.com',
        },
        spec: {
          region: 'aws-us-west-1',
          http: 'http://west.proxy.com',
          https: 'https://west.proxy.com',
        },
        status: {
          phase: 'available',
        },
      },
    ];

    DEV_ENV && rtv.verify(proxyModels, [[proxyModelTs]]);

    proxyModels.forEach((model) => {
      this.capture(
        'log',
        'addFakeItems()',
        `adding proxy to catalog, keyId=${model.metadata.uid}, name=${model.metadata.name}, namespace=${model.metadata.namespace}`
      );
      catalogSource.push(new ProxyEntity(model));
    });
  }
}
