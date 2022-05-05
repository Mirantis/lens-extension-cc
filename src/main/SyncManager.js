import * as fs from 'fs/promises';
import path from 'path';
import { reaction } from 'mobx';
import * as rtv from 'rtvjs';
import YAML from 'yaml';
import { Common } from '@k8slens/extensions';
import { DATA_CLOUD_EVENTS, DataCloud } from '../common/DataCloud';
import { CONNECTION_STATUSES } from '../common/Cloud';
import { cloudStore } from '../store/CloudStore';
import { syncStore } from '../store/SyncStore';
import {
  apiChangeTypes,
  apiCredentialKinds,
  apiKinds,
} from '../api/apiConstants';
import { logValue } from '../util/logger';
import * as consts from '../constants';
import {
  KUBECONFIG_DIR_NAME,
  catalogEntityModelTs,
  entityToString,
  findEntity,
  modelToString,
} from '../catalog/catalogEntities';
import { SshKeyEntity } from '../catalog/SshKeyEntity';
import { LicenseEntity } from '../catalog/LicenseEntity';
import { ProxyEntity } from '../catalog/ProxyEntity';
import { CredentialEntity } from '../catalog/CredentialEntity';

const {
  Catalog: { KubernetesCluster, CatalogEntity },
  Util: { Singleton },
} = Common;

/**
 * Namespace property to list of related API kinds.
 * @type {{ [index: string]: Array<string> }}
 */
const nsPropToKinds = {
  clusters: [apiKinds.CLUSTER],
  sshKeys: [apiKinds.PUBLIC_KEY],
  licenses: [apiKinds.RHEL_LICENSE],
  proxies: [apiKinds.PROXY],
  credentials: [
    apiKinds.OPENSTACK_CREDENTIAL,
    apiKinds.AWS_CREDENTIAL,
    apiKinds.EQUINIX_CREDENTIAL,
    apiKinds.VSPHERE_CREDENTIAL,
    apiKinds.AZURE_CREDENTIAL,
    apiKinds.BYO_CREDENTIAL,
  ],
};

/**
 * API kind to SyncStore property for kinds that are supported.
 * @type {{ [index: string]: string }}
 */
const kindToSyncStoreProp = {
  [apiKinds.CLUSTER]: 'clusters',
  [apiKinds.PUBLIC_KEY]: 'sshKeys',
  [apiKinds.OPENSTACK_CREDENTIAL]: 'credentials',
  [apiKinds.AWS_CREDENTIAL]: 'credentials',
  [apiKinds.EQUINIX_CREDENTIAL]: 'credentials',
  [apiKinds.VSPHERE_CREDENTIAL]: 'credentials',
  [apiKinds.AZURE_CREDENTIAL]: 'credentials',
  [apiKinds.BYO_CREDENTIAL]: 'credentials',
  [apiKinds.RHEL_LICENSE]: 'licenses',
  [apiKinds.PROXY]: 'proxies',
};

/**
 * API kind to Namespace property for kinds that are supported.
 * @type {{ [index: string]: string }}
 */
const kindToNamespaceProp = kindToSyncStoreProp; // same property names for now

/**
 * Synchronizes MCC namespaces with the Lens Catalog.
 * @class SyncManager
 */
export class SyncManager extends Singleton {
  /**
   * @param {LensExtension} extension Extension instance.
   * @param {Array<CatalogEntity>} catalogSource Registered Lens Catalog source.
   * @param {IpcMain} ipcMain Singleton instance for sending/receiving messages to/from Renderer.
   * @constructor
   */
  constructor(extension, catalogSource, ipcMain) {
    super();

    let _dataClouds = {};
    let _baseKubeConfigPath = null;

    /**
     * @readonly
     * @member {{ [index: string]: DataCloud }} dataClouds Map of Cloud URL to
     *  DataCloud instance.
     *
     *  __READONLY__: Assign/delete properties on the object, but don't set the entire
     *   property as a whole.
     */
    Object.defineProperty(this, 'dataClouds', {
      enumerable: true,
      get() {
        return _dataClouds;
      },
    });

    /**
     * @member {string|null} baseKubeConfigPath Base path for generated cluster kubeconfig
     *  files. `null` until determined. Does not end with a slash.
     */
    Object.defineProperty(this, 'baseKubeConfigPath', {
      enumerable: true,
      get() {
        return _baseKubeConfigPath;
      },
      set(newValue) {
        if (newValue !== _baseKubeConfigPath) {
          DEV_ENV &&
            rtv.verify(
              { baseKubeConfigPath: newValue },
              { baseKubeConfigPath: [rtv.STRING, (v) => !v.endsWith('/')] }
            );
          _baseKubeConfigPath = newValue;
        }
      },
    });

    /**
     * @readonly
     * @member {Array<CatalogEntity>} catalogSource Registered Lens Catalog source.
     */
    Object.defineProperty(this, 'catalogSource', {
      enumerable: true,
      get() {
        return catalogSource;
      },
    });

    /**
     * @readonly
     * @member {IpcMain} ipcMain Singleton instance for sending/receiving messages
     *  to/from Renderer.
     */
    Object.defineProperty(this, 'ipcMain', {
      enumerable: true,
      get() {
        return ipcMain;
      },
    });

    /**
     * @readonly
     * @member {LensExtension} extension The extension instance.
     */
    Object.defineProperty(this, 'extension', {
      enumerable: true,
      get() {
        return extension;
      },
    });

    //// Initialize

    ipcMain.handle(consts.ipcEvents.invoke.SYNC_NOW, this.handleSyncNow);
    ipcMain.handle(consts.ipcEvents.invoke.RECONNECT, this.handleReconnect);

    // @see https://mobx.js.org/reactions.html#reaction
    reaction(
      // react to changes in `clouds` array
      () => cloudStore.clouds,
      this.onCloudStoreChange,
      {
        // fire right away because it's unclear if the SyncStore will be loaded by now
        //  or now, and we don't want to sit there waiting for it when it's already
        //  loaded (meaning that `SyncStore.fromStore()` has been called by Lens at
        //  least once)
        fireImmediately: true,
        // debounce reactions to reduce churn if multiple Clouds somehow get updated
        //  at the same time
        delay: 100,
      }
    );

    // @see https://mobx.js.org/reactions.html#reaction
    reaction(
      // react to changes in `clouds` array
      () => ({
        credentials: syncStore.credentials,
        sshKeys: syncStore.sshKeys,
        clusters: syncStore.clusters,
        licenses: syncStore.licenses,
        proxies: syncStore.proxies,
      }),
      this.onSyncStoreChange,
      {
        // fire right away because it's unclear if the SyncStore will be loaded by now
        //  or now, and we don't want to sit there waiting for it when it's already
        //  loaded (meaning that `SyncStore.fromStore()` has been called by Lens at
        //  least once)
        fireImmediately: true,
        // debounce reactions to reduce churn; otherwise, we'll get reactions for
        //  each individual item added/removed/updated
        delay: 500,
      }
    );
  }

  /**
   * Removes all entities of a given DataCloud from the Catalog.
   * @param {DataCloud} dataCloud
   */
  async removeCloudFromCatalog(dataCloud) {
    this.ipcMain.capture(
      'info',
      'SyncManager.removeCloudFromCatalog()',
      `DataCloud deleted, removing all synced entities from Catalog; dataCloud=${dataCloud}`
    );

    //// GET KUBECONFIG FILE BASE PATH

    try {
      await this.determineBaseKubeConfigPath();
    } catch (err) {
      this.ipcMain.capture(
        'error',
        'SyncManager.removeCloudFromCatalog()',
        `Cannot remove Cloud entities: Failed to get Lens-designated extension file folder path; error="${err.message}"`
      );
      return;
    }

    //// DELETE ENTITIES AND CLUSTER KUBECONFIG FILES

    // NOTE: just in case the delete came at a strange time during sync, the most effective,
    //  sure way of removing the entities is not to loop through `dataCloud.syncedNamespaces`,
    //  but rather to simply find all entities related to its `dataCloud.cloudUrl` and
    //  just remove them
    let deleteCount = 0;

    ['catalog', 'syncStore'].forEach((target) => {
      const lists =
        target === 'catalog'
          ? [this.catalogSource]
          : // NOTE: we can't just flatten all the SyncStore lists into one because it'll lose its observability
            //  and we won't get actual models, we'll get "Mobx binding items" of some kind (not what you think!)
            syncStore.getListNames().map((name) => syncStore[name]);

      lists.forEach((list) => {
        let idx;
        while (
          (idx = list.findIndex((item) => {
            // entities and models have the same basic interface
            return item.metadata.cloudUrl === dataCloud.cloudUrl;
          })) >= 0
        ) {
          const item = list[idx];
          this.ipcMain.capture(
            'log',
            'SyncManager.removeCloudFromCatalog()',
            `Removing ${
              target === 'catalog' ? entityToString(item) : modelToString(item)
            } from Catalog and deleting kubeconfig file: Cloud deleted`
          );

          list.splice(idx, 1);

          if (target === 'catalog') {
            // catalog or syncStore, doesn't matter, just count once!
            deleteCount++;
          }
        }
      });
    });

    // no need to wait around for the promise to resolve or reject
    const cloudPath = this.getKubeConfigCloudPath(dataCloud.cloud);
    fs.rm(cloudPath, { force: true, recursive: true }).catch((err) => {
      this.ipcMain.capture(
        'error',
        'SyncManager.removeCloudFromCatalog()',
        `Failed to delete kubeconfig cloud path ${logValue(
          cloudPath
        )}; error=${logValue(err.message)}`
      );
    });

    this.ipcMain.capture(
      'info',
      'SyncManager.removeCloudFromCatalog()',
      `Done: DataCloud deleted, removed ${deleteCount} synced entities from Catalog; dataCloud=${dataCloud}`
    );
  }

  /**
   * Determines the __directory__ where a Cloud's kubeconfig files will be stored.
   * @param {Cluster} cluster
   * @returns {string} Absolute path to the __directory__ in which to store all of
   *  a Cloud's kubeconfig files.
   */
  getKubeConfigCloudPath(cloud) {
    if (!this.baseKubeConfigPath) {
      throw new Error(
        `Unable to generate kubeconfig path for ${cloud}: Base path is unknown`
      );
    }

    const url = new URL(cloud.cloudUrl);
    return path.resolve(
      this.baseKubeConfigPath,
      // NOTE: we're using the host because the user might change the Cloud's name, which
      //  would be difficult to sync up to in order not to lose files, and also keep them
      //  valid from Lens' standpoint; but the host should never change (if it did, the user
      //  would have to add a new Cloud with the new host, and remove the old one, which we
      //  handle just fine)
      url.host.replace(':', '-') // includes port if specified
    );
  }

  /**
   * Determines where a kubeconfig file will be stored.
   * @param {Cluster} cluster
   * @returns {string} Absolute path to the cluster's kubeconfig file.
   */
  getKubeConfigFilePath(cluster) {
    return path.resolve(
      this.getKubeConfigCloudPath(cluster.cloud),
      cluster.namespace.name,
      `${cluster.name}_${cluster.uid}.yaml`
    );
  }

  /**
   * Determines the base path for kubeconfig file storage if not already known.
   * @returns {Promise} Resolves on success, rejects on failure.
   */
  async determineBaseKubeConfigPath() {
    // the base path can only be obtained from Lens asynchronously and isn't specific to any
    //  DataCloud; we determine it on first need to know basis, and then we store it so we don't
    //  have to keep doing this
    if (!this.baseKubeConfigPath) {
      const extFolderPath = await this.extension.getExtensionFileFolder();
      this.baseKubeConfigPath = path.join(extFolderPath, KUBECONFIG_DIR_NAME);
    }
  }

  /**
   * Makes a new Catalog Entity from a given Catalog Entity Model, based on its kind.
   * @param {Object} model
   * @returns {CatalogEntity} New Catalog Entity.
   */
  mkEntity(model) {
    switch (model.metadata.kind) {
      case apiKinds.CLUSTER:
        return new KubernetesCluster(model);
      case apiKinds.PUBLIC_KEY:
        return new SshKeyEntity(model);
      case apiKinds.RHEL_LICENSE:
        return new LicenseEntity(model);
      case apiKinds.PROXY:
        return new ProxyEntity(model);
      default:
        if (Object.values(apiCredentialKinds).includes(model.metadata.kind)) {
          return new CredentialEntity(model);
        }
        throw new Error(
          `Unknown catalog model kind=${logValue(model.metadata.kind)}`
        );
    }
  }

  /**
   * Updates a Catalog Entity with metadata from a given Model.
   * @param {CatalogEntity} entity
   * @param {Object} model
   * @returns {boolean} True if the entity was updated.
   */
  updateEntity(entity, model) {
    DEV_ENV &&
      rtv.verify(
        { entity, model },
        {
          entity: [rtv.CLASS_OBJECT, { ctor: CatalogEntity }],
          model: catalogEntityModelTs,
        }
      );

    if (entity.metadata.kind !== model.metadata.kind) {
      this.ipcMain.capture(
        'error',
        'SyncStore.updateEntity()',
        `Attempted to update ${entityToString(entity)} using ${modelToString(
          model
        )} with incompatible kind`
      );
      return false;
    }

    ['metadata', 'spec', 'status'].forEach(
      (prop) => (entity[prop] = model[prop])
    );
    return true;
  }

  /**
   * Updates a Catalog Entity Model in the SyncStore.
   * @param {{ clusters: Array, proxies: Array, credentials: Array, sshKeys: Array, licenses: Array }} store
   *  The store to update. Doesn't necessarily have to be _the_ SyncStore.
   * @param {Object} model
   * @returns {boolean} True if the model was updated.
   */
  updateStoreModel(store, model) {
    DEV_ENV && rtv.verify({ model }, { model: catalogEntityModelTs });

    let prop;
    switch (model.metadata.kind) {
      case apiKinds.CLUSTER:
        prop = 'clusters';
        break;
      case apiKinds.PROXY:
        prop = 'proxies';
        break;
      case apiKinds.PUBLIC_KEY:
        prop = 'sshKeys';
        break;
      case apiKinds.RHEL_LICENSE:
        prop = 'licenses';
        break;
      default:
        if (
          DEV_ENV &&
          !Object.values(apiCredentialKinds).includes(model.metadata.kind)
        ) {
          throw new Error(
            `Unknown entity kind in model=${modelToString(model)}`
          );
        }
        prop = 'credentials';
        break;
    }

    // the UID should be unique, but just to be extra safe, we compare the Cloud URL too
    const idx = store[prop].findIndex(
      (m) =>
        m.metadata.uid === model.metadata.uid &&
        m.metadata.cloudUrl === model.metadata.cloudUrl
    );

    if (idx < 0) {
      this.ipcMain.capture(
        'warn',
        'SyncManager.updateStoreModel()',
        `Unable to update model in SyncStore: Not found; model=${modelToString(
          model
        )}`
      );
      return false;
    }

    store[prop][idx] = model;
    return true;
  }

  /**
   * Removes a single entity from the Catalog and returns it. If it's a cluster, its
   *  kubeConfig file is also scheduled for deletion.
   * @param {number} index Index of the item in the `catalogSource` array.
   * @returns {CatalogEntity} The entity that was removed.
   */
  removeEntityFromCatalog(index) {
    const entity = this.catalogSource[index];
    this.ipcMain.capture(
      'log',
      'SyncManager.removeEntityFromCatalog()',
      `Removing ${entityToString(entity)}`
    );

    this.catalogSource.splice(index, 1);

    if (entity.metadata.kind === apiKinds.CLUSTER) {
      // no need to wait around for the promise to fulfill
      fs.rm(entity.spec.kubeconfigPath).catch((err) => {
        this.ipcMain.capture(
          'error',
          'SyncManager.removeEntityFromCatalog()',
          `Failed to delete kubeconfig file of deleted ${entityToString(
            entity
          )}; error=${logValue(err.message)}`
        );
      });
    }

    return entity;
  }

  /**
   * Removes all entities from the Catalog that aren't found in the Cloud's known resources.
   * @param {DataCloud} dataCloud
   * @param {{ [index: string]: true }} cloudResourceIds Map of known resource UID to `true`
   *  for all known resources of the specified `kind`.
   * @param {Array<string>} kinds Kinds of resources of clean. List of `apiKinds` enum values.
   * @returns {number} Number of entities removed from the Catalog.
   */
  cleanCatalog(dataCloud, cloudResourceIds, kinds) {
    DEV_ENV &&
      rtv.verify(
        { kinds },
        { kinds: [[rtv.STRING, { oneOf: Object.values(apiKinds) }]] }
      );

    let deleteCount = 0;
    let idx;

    while (
      (idx = this.catalogSource.findIndex((entity) => {
        return (
          kinds.includes(entity.metadata.kind) &&
          entity.metadata.cloudUrl === dataCloud.cloudUrl &&
          !cloudResourceIds[entity.metadata.uid]
        );
      })) >= 0
    ) {
      this.removeEntityFromCatalog(idx);
      deleteCount++;
    }

    return deleteCount;
  }

  /**
   * Removes a single model from the SyncStore and returns it.
   * @param {Array} storeList A list from the SyncStore that contains the model.
   * @param {number} index Index of the item in the `catalogSource` array.
   * @returns {Object} The model that was removed.
   */
  removeModelFromStore(storeList, index) {
    const model = storeList[index];
    this.ipcMain.capture(
      'log',
      'SyncManager.removeModelFromStore()',
      `Removing ${modelToString(model)}`
    );

    storeList.splice(index, 1);

    return model;
  }

  /**
   * Removes all models from the a list in the SyncStore that aren't found in the Cloud's known
   *  resources.
   * @param {DataCloud} dataCloud
   * @param {{ [index: string]: true }} cloudResourceIds Map of known resource UID to `true`
   *  for all known resources of a specific kind.
   * @param {Array} storeList A list from the SyncStore that contains models of the same kind
   *  as are mapped in `cloudResourceIds`.
   * @returns {number} Number of models removed from the `storeList`.
   */
  cleanStore(dataCloud, cloudResourceIds, storeList) {
    let deleteCount = 0;
    let idx;

    while (
      (idx = storeList.findIndex((model) => {
        // the UID should be unique, but just to be extra safe, we compare the Cloud URL too
        return (
          model.metadata.cloudUrl === dataCloud.cloudUrl &&
          !cloudResourceIds[model.metadata.uid]
        );
      })) >= 0
    ) {
      this.removeModelFromStore(storeList, idx);
      deleteCount++;
    }

    return deleteCount;
  }

  /**
   * [ASYNC] Updates a DataCloud's clusters in the Catalog and temporary store.
   * @param {DataCloud} dataCloud
   * @param {Array<Cluster>} clusters List of clusters. This is either ALL known clusters
   *  across ALL __synced__ namespaces in the `dataCloud`; or it's a subset of clusters,
   *  in which case `skipDelete` should be `true` to avoid incorrectly deleting clusters
   *  that aren't in this list but are found in the Catalog.
   * @param {{ clusters: Array, proxies: Array, credentials: Array, sshKeys: Array, licenses: Array }} jsonStore
   *  A disconnected (in terms of Mobx) replica of the SyncStore to update with cluster model changes.
   * @param {boolean} [skipDelete] If true, the list of clusters is not considered complete
   *  and therefore not used to determine which Catalog entities should be removed as a result
   *  of a cluster not being in this list but being found in the Catalog.
   */
  async updateClusterEntities(
    dataCloud,
    clusters,
    jsonStore,
    skipDelete = false
  ) {
    this.ipcMain.capture(
      'info',
      'SyncManager.updateClusterEntities()',
      `Processing cluster entities (skipDelete=${skipDelete}) for changes in dataCloud=${dataCloud}`
    );

    const ACTION_ADDED = 'added';
    const ACTION_UPDATED = 'updated';

    //// GET KUBECONFIG FILE BASE PATH

    try {
      await this.determineBaseKubeConfigPath();
    } catch (err) {
      this.ipcMain.capture(
        'error',
        'SyncManager.updateClusterEntities()',
        `Cannot update clusters: Failed to get Lens-designated extension file folder path; error="${err.message}"`
      );
      return;
    }

    //// CREATE KUBECONFIG FILES FOR NEW ENTITIES (and update existing ones)

    // start by determining what is new and what has been updated
    // promises resolve to objects with the following shape, or reject to an `Error`:
    //  {
    //   cluster: Cluster,
    //   model: clusterEntityModelTs, // model created from `cluster`
    //   catEntity?: KubernetesCluster, // EXISTING Catalog Entity (if action not 'added')
    //   action: 'added' | 'updated' | null
    // }
    const promises = clusters.map((cluster) => {
      if (!cluster.configReady) {
        return Promise.reject(
          new Error(
            `Cannot add/update cluster that is not config-ready; cluster=${cluster}`
          )
        );
      }

      const configFilePath = this.getKubeConfigFilePath(cluster);
      const configDirPath = path.dirname(configFilePath);
      const model = cluster.toModel(configFilePath);

      const catEntity = findEntity(this.catalogSource, model);
      if (catEntity) {
        // entity exists already in the Catalog: either same (no changes) or updated
        if (catEntity.metadata.resourceVersion === cluster.resourceVersion) {
          return Promise.resolve({
            cluster,
            model,
            catEntity,
            action: null, // no changes
          });
        } else {
          // something about that resource has changed since the last time we fetched it
          return Promise.resolve({
            cluster,
            model,
            catEntity,
            action: ACTION_UPDATED,
          });
        }
      } else {
        // new entity we have discovered: create kubeconfig file
        const kubeConfig = cluster.getKubeConfig();
        return fs.mkdir(configDirPath, { recursive: true }).then(
          () =>
            fs
              .writeFile(
                configFilePath,
                // NOTE: the 'simpleKeys' YAML option ensures that the output uses implicit vs
                //  explicit notation, which appears to fix the issue where if all of an object's
                //  properties are `null`, the resulting notation for the object is such that each
                //  key is preceded by a `?` YAML operator, which Lens doesn't support/expect
                YAML.stringify(kubeConfig, { simpleKeys: true })
              )
              .then(
                () => ({
                  cluster,
                  model,
                  catEntity, // will be undefined because not found in Catalog
                  action: ACTION_ADDED,
                }),
                (err) => {
                  throw new Error(
                    `Failed to write kubeconfig file: Unable to add cluster; filePath=${logValue(
                      configFilePath
                    )}, error=${logValue(err.message)}, cluster=${cluster}`
                  );
                }
              ),
          (err) => {
            throw new Error(
              `Failed to create kubeconfig directory: Unable to add cluster; path=${logValue(
                configDirPath
              )}, error=${logValue(err.message)}, cluster=${cluster}`
            );
          }
        );
      }
    });

    //// ADD, UPDATE, DELETE CATALOG ENTITIES

    return Promise.allSettled(promises).then((results) => {
      const newModels = []; // new models for SyncStore
      const newEntities = []; // new entities for Catalog
      const cloudClusterIds = {}; // map of string -> `true` for all valid/ready clusters in this Cloud
      let catUpdateCount = 0;
      let storeUpdateCount = 0;

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { cluster, model, catEntity, action } = result.value;

          cloudClusterIds[cluster.uid] = true;

          if (action === ACTION_ADDED) {
            this.ipcMain.capture(
              'log',
              'SyncManager.updateClusterEntities()',
              `Adding new ${cluster} to Catalog and Store`
            );
            newEntities.push(this.mkEntity(model));
            newModels.push(model);
          } else if (action === ACTION_UPDATED) {
            this.ipcMain.capture(
              'log',
              'SyncManager.updateClusterEntities()',
              `Updating ${cluster} in Catalog and Store: resourceVersion ${logValue(
                catEntity.metadata.resourceVersion
              )} -> ${logValue(cluster.resourceVersion)}`
            );

            if (this.updateEntity(catEntity, model)) {
              catUpdateCount++;
            }

            if (this.updateStoreModel(jsonStore, model)) {
              storeUpdateCount++;
            }
          } else {
            this.ipcMain.capture(
              'log',
              'SyncManager.updateClusterEntities()',
              `Skipping ${cluster} update: No changes detected`
            );
          }
        } else {
          this.ipcMain.capture(
            'warn',
            'SyncManager.updateClusterEntities()',
            // NOTE: `reason.message` already has information about the cluster affected
            //  because it's an error message we generated in previous loop that created
            //  all the promises whose results we're now looping through
            `(Ignoring cluster) ${result.reason.message}`
          );
        }
      });

      // remove all entities from the Catalog and temp Store of this type that no longer exist
      //  in the Cloud
      const catDelCount = skipDelete
        ? 0
        : this.cleanCatalog(dataCloud, cloudClusterIds, [apiKinds.CLUSTER]);
      const storeDelCount = skipDelete
        ? 0
        : this.cleanStore(dataCloud, cloudClusterIds, jsonStore.clusters);

      // add all the new entities to the Catalog
      newEntities.forEach((entity) => this.catalogSource.push(entity));

      this.ipcMain.capture(
        'info',
        'SyncManager.updateClusterEntities()',
        `Have added=${
          newEntities.length
        }, updated=${catUpdateCount}, deleted=${catDelCount} cluster Catalog entities for dataCloud=${logValue(
          dataCloud.cloudUrl
        )}`
      );

      // add all the new models to the temporary store
      newModels.forEach((model) => jsonStore.clusters.push(model));

      this.ipcMain.capture(
        'info',
        'SyncManager.updateClusterEntities()',
        `Will add=${
          newModels.length
        }, update=${storeUpdateCount}, delete=${storeDelCount} cluster SyncStore models for dataCloud=${logValue(
          dataCloud.cloudUrl
        )}`
      );

      this.ipcMain.capture(
        'info',
        'SyncManager.updateClusterEntities()',
        `Done: Processed cluster entities (skipDelete=${skipDelete}) for changes in dataCloud=${dataCloud}`
      );
    });
    // NOTE: Promise.allSettled() does not fail
  }

  /**
   * [ASYNC] Updates a DataCloud's entities in the Catalog and temporary store.
   * @param {DataCloud} dataCloud
   * @param {{ clusters: Array<Cluster>, proxies: Array<Proxy>, credentials: Array<Credential>, sshKeys: Array<SshKey>, licenses: Array<License> }} resources
   *  Lists of resources. This is either ALL known resources across ALL __synced__ namespaces in
   *  the `dataCloud`; or it's a subset of resources, in which case `skipDelete` should be `true`
   *  to avoid incorrectly deleting resources that aren't in this list but are found in the Catalog.
   * @param {{ clusters: Array, proxies: Array, credentials: Array, sshKeys: Array, licenses: Array }} jsonStore
   *  A disconnected (in terms of Mobx) replica of the SyncStore to update with cluster model changes.
   * @param {boolean} [skipDelete] If true, the list of resources is not considered complete
   *  and therefore not used to determine which Catalog entities should be removed as a result
   *  of a resource not being in this list but being found in the Catalog.
   */
  async updateCatalogEntities(
    dataCloud,
    resources,
    jsonStore,
    skipDelete = false
  ) {
    this.ipcMain.capture(
      'info',
      'SyncManager.updateCatalogEntities()',
      `Processing entities (skipDelete=${skipDelete}) for changes in dataCloud=${dataCloud}`
    );

    // property names for lists on Namespace and SyncStore classes
    const types = ['sshKeys', 'credentials', 'proxies', 'licenses'];

    types.forEach((type) => {
      const newModels = []; // new models for SyncStore
      const newEntities = []; // new entities for Catalog
      const cloudResourceIds = {}; // map of string -> `true` for all resources of this type in this Cloud
      let catUpdateCount = 0;
      let storeUpdateCount = 0;

      // start by determining what is new and what has been updated
      resources[type].forEach((resource) => {
        cloudResourceIds[resource.uid] = true;

        const model = resource.toModel();
        const catEntity = findEntity(this.catalogSource, model);

        if (catEntity) {
          // entity exists already in the Catalog: either same (no changes) or updated
          if (catEntity.metadata.resourceVersion === resource.resourceVersion) {
            this.ipcMain.capture(
              'log',
              'SyncManager.updateCatalogEntities()',
              `Skipping ${resource} update: No changes detected`
            );
          } else {
            // something about that resource has changed since the last time we fetched it
            this.ipcMain.capture(
              'log',
              'SyncManager.updateCatalogEntities()',
              `Updating ${resource} in Catalog and SyncStore: resourceVersion ${logValue(
                catEntity.metadata.resourceVersion
              )} -> ${logValue(resource.resourceVersion)}`
            );

            if (this.updateEntity(catEntity, model)) {
              catUpdateCount++;
            }

            if (this.updateStoreModel(jsonStore, model)) {
              storeUpdateCount++;
            }
          }
        } else {
          // new entity we have discovered: add to Catalog and Store
          this.ipcMain.capture(
            'log',
            'SyncManager.updateCatalogEntities()',
            `Adding new ${resource} to Catalog and SyncStore`
          );
          newEntities.push(this.mkEntity(model));
          newModels.push(model);
        }
      });

      // remove all entities from the Catalog and temp Store of this type that no longer exist
      //  in the Cloud
      const catDelCount = skipDelete
        ? 0
        : this.cleanCatalog(dataCloud, cloudResourceIds, nsPropToKinds[type]);
      const storeDelCount = skipDelete
        ? 0
        : this.cleanStore(dataCloud, cloudResourceIds, jsonStore[type]);

      // add all the new entities to the Catalog
      newEntities.forEach((entity) => this.catalogSource.push(entity));

      this.ipcMain.capture(
        'info',
        'SyncManager.updateCatalogEntities()',
        `Have added=${
          newEntities.length
        }, updated=${catUpdateCount}, deleted=${catDelCount} ${type} Catalog entities for dataCloud=${logValue(
          dataCloud.cloudUrl
        )}`
      );

      // add all the new models to the temporary store
      newModels.forEach((model) => jsonStore[type].push(model));

      this.ipcMain.capture(
        'info',
        'SyncManager.updateCatalogEntities()',
        `Will add=${
          newModels.length
        }, update=${storeUpdateCount}, delete=${storeDelCount} ${type} SyncStore models for dataCloud=${logValue(
          dataCloud.cloudUrl
        )}`
      );
    });

    await this.updateClusterEntities(
      dataCloud,
      resources.clusters,
      jsonStore,
      skipDelete
    );

    this.ipcMain.capture(
      'info',
      'SyncManager.updateCatalogEntities()',
      `Done: Processed entities (skipDelete=${skipDelete}) for changes in dataCloud=${dataCloud}`
    );
  }

  //
  // EVENT HANDLERS
  //

  /**
   * Called whenever the `clouds` property of the CloudStore changes in some way
   *  (shallow or deep).
   * @param {Array<Cloud>} storeClouds Current/new `CloudStore.clouds` value (as configured
   *  by the reaction()).
   * @see https://mobx.js.org/reactions.html#reaction
   */
  onCloudStoreChange = () => {
    const oldSyncedDCs = { ...this.dataClouds };

    // add new DataClouds for new Clouds added to CloudStore
    Object.entries(cloudStore.clouds).forEach(([cloudUrl, cloud]) => {
      if (!this.dataClouds[cloudUrl]) {
        // NOTE: SyncManager only runs on the MAIN thread and always needs full data
        //  so we create full instances, not preview ones
        // NOTE: initial data fetch is scheduled internally by the DataCloud itself
        this.ipcMain.capture(
          'info',
          'SyncManager.onCloudStoreChange()',
          `Detected new Cloud, creating new DataCloud for it; cloud=${cloud}`
        );

        const dataCloud = new DataCloud(cloud, false, this.ipcMain);

        dataCloud.addEventListener(
          DATA_CLOUD_EVENTS.DATA_UPDATED,
          this.onDataUpdated
        );
        dataCloud.addEventListener(
          DATA_CLOUD_EVENTS.RESOURCE_UPDATED,
          this.onResourceUpdated
        );

        this.dataClouds[cloudUrl] = dataCloud;
      }
    });

    // filter out updated Clouds
    Object.keys(oldSyncedDCs).forEach((cloudUrl) => {
      if (cloudStore.clouds[cloudUrl]) {
        // still exists so remove from the old list so we don't destroy it
        // NOTE: the CloudStore is careful to update existing Cloud instances when
        //  they change in the cloud-store.json file, and those updates will cause
        //  CLOUD_EVENTS to fire if appropriate, which wrapping DataClouds will have
        //  already seen by now
        delete oldSyncedDCs[cloudUrl];
      }
    });

    // destroy any old Clouds removed from the CloudStore
    Object.entries(oldSyncedDCs).forEach(([cloudUrl, dataCloud]) => {
      this.ipcMain.capture(
        'info',
        'SyncManager.onCloudStoreChange()',
        `Destroying old DataCloud removed from CloudStore; dataCloud=${dataCloud}`
      );

      dataCloud.removeEventListener(
        DATA_CLOUD_EVENTS.DATA_UPDATED,
        this.onDataUpdated
      );
      dataCloud.removeEventListener(
        DATA_CLOUD_EVENTS.RESOURCE_UPDATED,
        this.onResourceUpdated
      );

      this.removeCloudFromCatalog(dataCloud);

      dataCloud.cloud.destroy(); // CloudStore should already have done this, but just in case (probably noop)
      dataCloud.destroy();

      delete this.dataClouds[cloudUrl];
    });

    this.ipcMain.capture(
      'info',
      'SyncManager.onCloudStoreChange()',
      'Done: DataClouds updated'
    );
  };

  /**
   * Called whenever properties of the SyncStore change (shallow or deep).
   * @param {{
   *   credentials: Array,
   *   sshKeys: Array,
   *   clusters: Array,
   *   licenses: Array,
   *   proxies: Array,
   * }} state State of the SyncStore (value generated by configured reaction()).
   * @see https://mobx.js.org/reactions.html#reaction
   */
  onSyncStoreChange = (state) => {
    this.ipcMain.capture(
      'info',
      'SyncManager.onSyncStoreChange()',
      'SyncStore state has changed: Updating Catalog'
    );

    Object.keys(state).forEach((type) => {
      const newEntities = []; // new entities for Catalog
      const knownModelIds = {}; // map of string -> `true` for all resources of this type
      let updateCount = 0;
      let deleteCount = 0;
      const models = state[type];

      // start by determining what is new and what has been updated
      models.forEach((model) => {
        knownModelIds[model.metadata.uid] = true;

        const entity = findEntity(this.catalogSource, model);
        if (entity) {
          if (
            entity.metadata.resourceVersion === model.metadata.resourceVersion
          ) {
            this.ipcMain.capture(
              'log',
              'SyncManager.onSyncStoreChange()',
              `Skipping ${modelToString(model)} update: No changes detected`
            );
          } else {
            // something about that resource has changed since the last time we fetched it
            this.ipcMain.capture(
              'log',
              'SyncManager.onSyncStoreChange()',
              `Updating ${modelToString(
                model
              )} in Catalog: resourceVersion ${logValue(
                entity.metadata.resourceVersion
              )} -> ${logValue(model.metadata.resourceVersion)}`
            );
            if (this.updateEntity(entity, model)) {
              updateCount++;
            }
          }
        } else {
          // new entity we have discovered: add to Catalog
          this.ipcMain.capture(
            'log',
            'SyncManager.onSyncStoreChange()',
            `Adding new ${modelToString(model)} to Catalog`
          );
          newEntities.push(this.mkEntity(model));
        }
      });

      // next, remove all entities from the Catalog of this type that no longer exist in the SyncStore
      let idx;
      while (
        (idx = this.catalogSource.findIndex((entity) => {
          // NOTE: since it's our Catalog Source, it only contains our items, so we should
          //  never encounter a case where there's no mapped property
          const prop = kindToSyncStoreProp[entity.metadata.kind];
          return prop === type && !knownModelIds[entity.metadata.uid];
        })) >= 0
      ) {
        const entity = this.catalogSource[idx];
        this.ipcMain.capture(
          'log',
          'SyncManager.onSyncStoreChange()',
          `Removing entity ${entityToString(entity)} from Catalog: Deleted`
        );
        this.catalogSource.splice(idx, 1);
        deleteCount++;
      }

      // finally, add all the new entities to the Catalog
      newEntities.forEach((entity) => this.catalogSource.push(entity));

      this.ipcMain.capture(
        'info',
        'SyncManager.onSyncStoreChange()',
        `Added=${newEntities.length}, updated=${updateCount}, deleted=${deleteCount} ${type} Catalog entities`
      );
    });

    this.ipcMain.capture(
      'info',
      'SyncManager.onSyncStoreChange()',
      'Done: Catalog updated'
    );
  };

  /**
   * Called to trigger an immediate sync of the specified Cloud if it's known and
   *  isn't currently fetching data.
   * @param {string} event ID provided by Lens.
   * @param {string} cloudUrl URL for the Cloud to sync.
   */
  handleSyncNow = (event, cloudUrl) => {
    if (cloudUrl && this.dataClouds[cloudUrl]) {
      const dc = this.dataClouds[cloudUrl];
      if (dc.cloud.connected && !dc.fetching) {
        this.ipcMain.capture(
          'info',
          'SyncManager.handleSyncNow()',
          `Syncing now; dataCloud=${logValue(cloudUrl)}`
        );
        dc.fetchNow();
      } else {
        this.ipcMain.capture(
          'info',
          'SyncManager.handleSyncNow()',
          `Cannot sync now: Cloud is either not connected or currently syncing; dataCloud=${dc}`
        );
      }
    } else {
      this.ipcMain.capture(
        'error',
        'SyncManager.handleSyncNow()',
        `Unknown Cloud; cloudUrl=${logValue(cloudUrl)}`
      );
    }
  };

  /**
   * Called to trigger a reconnection to a Cloud that should be currently disconnected.
   * @param {string} event ID provided by Lens.
   * @param {string} cloudUrl URL for the Cloud.
   */
  handleReconnect = (event, cloudUrl) => {
    if (cloudUrl && this.dataClouds[cloudUrl]) {
      const dc = this.dataClouds[cloudUrl];
      if (dc.cloud.status === CONNECTION_STATUSES.DISCONNECTED) {
        this.ipcMain.capture(
          'info',
          'SyncManager.handleReconnect()',
          `Reconnecting; dataCloud=${logValue(cloudUrl)}`
        );
        dc.reconnect();
      } else {
        this.ipcMain.capture(
          'info',
          'SyncManager.handleReconnect()',
          `Will not reconnect: Cloud is not disconnected; dataCloud=${dc}`
        );
      }
    } else {
      this.ipcMain.capture(
        'error',
        'SyncManager.handleReconnect()',
        `Unknown Cloud; cloudUrl=${logValue(cloudUrl)}`
      );
    }
  };

  // TODO[PRODX-22469]: Remove if we drop watches. Currently untested code because of body
  //  extraction issue (see other related comments).
  /**
   * Called whenever a DataCloud's resources have changed.
   * @param {Object} event
   * @param {DataCloud} event.dataCloud The updated DataCloud.
   * @param {Object} info
   * @param {Array<{ type: "ADDED"|"MODIFIED"|"DELETE", resource: Resource }>} info.updates
   */
  onResourceUpdated = async ({ target: dataCloud }, { updates }) => {
    this.ipcMain.capture(
      'info',
      'SyncManager.onResourceUpdated()',
      `Updating Catalog and SyncStore after resource updates in dataCloud=${dataCloud}`
    );

    // get a 'disconnected' version of the SyncStore that won't react to every single
    //  change so that we can effectively batch changes to as few as possible, and
    //  avoid them taking place while we're still churning through Cloud updates
    // NOTE: we can update the `catalogSource` directly because we don't watch it;
    //  it's a one-way change here and reflected in Lens
    const jsonStore = syncStore.toPureJSON();

    // map of Namespace property name to list of added or modified resources
    const updatedResources = {};
    updates.forEach(({ type: updateType, resource }) => {
      if (resource.kind === apiKinds.NAMESPACE) {
        // not expecting to get updates to namespaces here; namespace updates should result in
        //  a full data fetch and wholesale catalog/store update via `onDataUpdated()` handler
        this.ipcMain.capture(
          'warn',
          'SyncManager.onResourceUpdated()',
          `Ignoring unexpected ${logValue(
            updateType
          )} update to namespace resource; resource=${resource}`
        );
        return;
      }

      if (updateType === apiChangeTypes.DELETED) {
        const catIdx = this.catalogSource.findIndex(
          (entity) =>
            entity.metadata.kind === resource.kind &&
            entity.metadata.name === resource.name &&
            entity.metadata.cloudUrl === resource.cloud.cloudUrl
        );
        if (catIdx >= 0) {
          this.removeEntityFromCatalog(catIdx);
        }

        const storeList = jsonStore[kindToSyncStoreProp[resource.kind]];
        const listIdx = storeList.findIndex(
          (model) =>
            model.metadata.name === resource.name &&
            model.metadata.cloudUrl === resource.cloud.cloudUrl
        );
        if (listIdx >= 0) {
          this.removeModelFromStore(storeList, listIdx);
        }
      } else {
        // assuming ADDED or MODIFIED resource
        const prop = kindToNamespaceProp[resource.kind];
        updatedResources[prop] ||= [];
        updatedResources[prop].push(resource);
      }
    });

    // skip deleting entities because we've done that here, and `addModResources`
    //  is not representative of ALL synced resources since we're only processing
    //  individual resource updates as opposed to an update after a full data fetch
    await this.updateCatalogEntities(
      dataCloud,
      updatedResources,
      jsonStore,
      true
    );

    // save the models in the store
    Object.keys(jsonStore).forEach((key) => (syncStore[key] = jsonStore[key]));

    this.ipcMain.capture(
      'info',
      'SyncManager.onResourceUpdated()',
      `Done: Updated Catalog and SyncStore after resource updates in dataCloud=${dataCloud}`
    );
  };

  /**
   * Called whenever a DataCloud's data has been updated.
   * @param {Object} event
   * @param {DataCloud} event.dataCloud The updated DataCloud.
   */
  onDataUpdated = async ({ target: dataCloud }) => {
    this.ipcMain.capture(
      'info',
      'SyncManager.onDataUpdated()',
      `Updating Catalog and SyncStore after changes in dataCloud=${dataCloud}`
    );

    // get a 'disconnected' version of the SyncStore that won't react to every single
    //  change so that we can effectively batch changes to as few as possible, and
    //  avoid them taking place while we're still churning through Cloud updates
    // NOTE: we can update the `catalogSource` directly because we don't watch it;
    //  it's a one-way change here and reflected in Lens
    const jsonStore = syncStore.toPureJSON();

    const types = [
      'clusters',
      'machines',
      'sshKeys',
      'credentials',
      'proxies',
      'licenses',
    ];

    // ALL resources of each type across ALL __synced__ namespaces since we don't
    //  know what changed
    const resources = types.reduce((acc, type) => {
      acc[type] = dataCloud.syncedNamespaces.flatMap((ns) => ns[type]);
      return acc;
    }, {});

    await this.updateCatalogEntities(dataCloud, resources, jsonStore);

    // save the models in the store
    Object.keys(jsonStore).forEach((key) => (syncStore[key] = jsonStore[key]));

    this.ipcMain.capture(
      'info',
      '.onDataUpdated()',
      `Done: Updated Catalog and SyncStore for changes in dataCloud=${dataCloud}`
    );
  };
}
