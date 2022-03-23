import * as fs from 'fs/promises';
import path from 'path';
import { reaction } from 'mobx';
import * as rtv from 'rtvjs';
import { isEqual } from 'lodash';
import YAML from 'yaml';
import { Common } from '@k8slens/extensions';
import { DATA_CLOUD_EVENTS, DataCloud } from '../common/DataCloud';
import { cloudStore } from '../store/CloudStore';
import { syncStore } from '../store/SyncStore';
import { apiCredentialKinds, apiKinds } from '../api/apiConstants';
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
 * API kind to Namespace property for kinds that are supported.
 * @type {{ [index: string]: string }}
 */
const kindtoNamespaceProp = {
  [apiKinds.CLUSTER]: 'clusters',
  [apiKinds.PUBLIC_KEY]: 'sshKeys',
  [apiKinds.OPENSTACK_CREDENTIAL]: 'credentials',
  [apiKinds.AWS_CREDENTIAL]: 'credentials',
  [apiKinds.EQUINIX_CREDENTIAL]: 'credentials',
  [apiKinds.VSPHERE_CREDENTIAL]: 'credentials',
  [apiKinds.AZURE_CREDENTIAL]: 'credentials',
  [apiKinds.BYO_CREDENTIAL]: 'credentials',
  [apiKinds.METAL_CREDENTIAL]: 'credentials',
  [apiKinds.RHEL_LICENSE]: 'licenses',
  [apiKinds.PROXY]: 'proxies',
};

/**
 * API kind to SyncStore property for kinds that are supported.
 * @type {{ [index: string]: string }}
 */
const kindToSyncStoreProp = { ...kindtoNamespaceProp }; // happens to use same prop names for now

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

    let _cloudTokens = {};
    let _dataClouds = {};
    let _baseKubeConfigPath = null;

    /**
     * @member {{ [index: string]: string }} cloudTokens Map of Cloud URL to Cloud
     *  access token for all known Clouds in the CloudStore.
     */
    Object.defineProperty(this, 'cloudTokens', {
      enumerable: true,
      get() {
        return _cloudTokens;
      },
      set(newValue) {
        if (newValue !== _cloudTokens || !isEqual(newValue, _cloudTokens)) {
          DEV_ENV &&
            rtv.verify(
              { cloudTokens: newValue },
              {
                // map of cloudUrl -> Cloud access token (could be `null` if the Cloud
                //  doesn't have any tokens yet, or its tokens get reset after
                //  getting disconnected)
                cloudTokens: [
                  rtv.HASH_MAP,
                  { $values: [rtv.EXPECTED, rtv.STRING] },
                ],
              }
            );
          _cloudTokens = newValue;
        }
      },
    });

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

    ipcMain.handle(consts.ipcEvents.invoke.SYNC_NOW, this.onSyncNow);

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
   * Triages current Cloud URLs into 3 lists: new, updated, and deleted.
   * @param {{ [index: string]: string|null }} cloudStoreTokens Map of Cloud URL to token for
   *  the current set of known Clouds stored on disk.
   *
   *  CAREFUL: Clouds that are not connected may have `null` tokens if they were explicitly
   *   disconnected (and tokens reset).
   *
   * @return {{ cloudUrlsToAdd: Array<string>, cloudUrlsToUpdate: Array<string>, cloudUrlsToRemove: Array<string> }}
   *  An object with `cloudUrlsToAdd` being a list of new Cloud URLs to add, `cloudUrlsToRemove` a list
   *  of old Clouds to remove (deleted), and `cloudUrlsToUpdate` a list of Clouds that have
   *  changed but are still in use. Any of these lists could be empty.
   */
  triageCloudUrls(cloudStoreTokens) {
    const cloudUrlsToAdd = [];
    const cloudUrlsToUpdate = [];
    const cloudUrlsToRemove = [];

    Object.keys(this.cloudTokens).forEach((providerUrl) => {
      if (cloudStoreTokens[providerUrl] !== undefined) {
        // provider URL is also in CloudStore set of URLs: if the token has changed,
        //  it's updated (as far as we're concerned here in DataCloudProvider)
        if (cloudStoreTokens[providerUrl] !== this.cloudTokens[providerUrl]) {
          cloudUrlsToUpdate.push(providerUrl);
        }
      } else {
        // provider URL is not in CloudStore set of URLs: removed
        cloudUrlsToRemove.push(providerUrl);
      }
    });

    const curCount = Object.keys(cloudStoreTokens).length;
    if (
      cloudUrlsToUpdate.length !== curCount &&
      cloudUrlsToRemove.length !== curCount
    ) {
      // there's at least one new URL (or none) in `currentTokens`
      Object.keys(cloudStoreTokens).forEach((curUrl) => {
        if (this.cloudTokens[curUrl] === undefined) {
          // not a stored/known URL: must be new
          cloudUrlsToAdd.push(curUrl);
        }
      });
    }

    return { cloudUrlsToAdd, cloudUrlsToUpdate, cloudUrlsToRemove };
  }

  /**
   * Removes all entities of a given DataCloud from the Catalog.
   * @param {DataCloud} dataCloud
   */
  async removeFromCatalog(dataCloud) {
    this.ipcMain.capture(
      'info',
      'SyncManager.removeFromCatalog()',
      `DataCloud deleted, removing all synced entities from Catalog; dataCloud=${dataCloud}`
    );

    //// GET KUBECONFIG FILE BASE PATH

    try {
      await this.determineBaseKubeConfigPath();
    } catch (err) {
      this.ipcMain.capture(
        'error',
        'SyncManager.updateClusters()',
        `Cannot update clusters: Failed to get Lens-designated extension file folder path; error="${err.message}"`
      );
      return;
    }

    //// DELETE ENTITIES AND CLUSTER KUBECONFIG FILES

    // NOTE: just in case the delete came at a strange time during sync, the most effective,
    //  sure way of removing the entities is not to loop through `dataCloud.syncedNamespaces`,
    //  but rather to simply find all entities related to its `dataCloud.cloud.cloudUrl` and
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
            return item.metadata.cloudUrl === dataCloud.cloud.cloudUrl;
          })) >= 0
        ) {
          const item = list[idx];
          this.ipcMain.capture(
            'log',
            'SyncManager.removeFromCatalog()',
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
        'SyncManager.removeFromCatalog()',
        `Failed to delete kubeconfig cloud path ${logValue(
          cloudPath
        )}; error=${logValue(err.message)}`
      );
    });

    this.ipcMain.capture(
      'info',
      'SyncManager.removeFromCatalog()',
      `Done: DataCloud deleted, removed ${deleteCount} synced entities from Catalog; dataCloud=${dataCloud}`
    );
  }

  /**
   * Update extended clouds after a change in the CloudStore.
   * @param {Object} params
   * @param {{ [index: string]: string }} params.cloudStoreTokens Map of Cloud URL to token for
   *  the current set of known Clouds stored on disk.
   * @param {Array<string>} params.cloudUrlsToAdd List of new cloudUrls to be added
   * @param {Array<string>} params.cloudUrlsToUpdate List of cloudUrls that have to be updated
   * @param {Array<string>} params.cloudUrlsToRemove List of cloudUrls that must be removed
   * @private
   */
  updateClouds({
    cloudStoreTokens,
    cloudUrlsToAdd,
    cloudUrlsToUpdate,
    cloudUrlsToRemove,
  }) {
    // update state to current CloudStore tokens
    this.cloudTokens = cloudStoreTokens;

    cloudUrlsToRemove.forEach((url) => {
      // destroy and remove DataCloud
      const dc = this.dataClouds[url];
      dc.removeEventListener(
        DATA_CLOUD_EVENTS.DATA_UPDATED,
        this.onDataUpdated
      );
      this.removeFromCatalog(dc);
      dc.cloud.destroy();
      dc.destroy();
      delete this.dataClouds[url];
    });

    cloudUrlsToAdd.concat(cloudUrlsToUpdate).forEach((url) => {
      const cloud = cloudStore.clouds[url];

      // if dataCloud exists - update dataCloud.cloud
      if (this.dataClouds[url]) {
        // NOTE: updating the DC's Cloud instance will cause the DC to fetch new data,
        //  IIF the `cloud` is actually a new instance at the same URL; it's not always
        //  new as the CloudStore listens for changes on each Cloud and triggers the
        //  `autorun()` Mobx binding in the SyncManager declaration whenever
        //  that happens, but we still make the assignment just in case it's new and
        //  leave it to the DataCloud to optimize what it does if the instance is
        //  the same as it already has
        this.dataClouds[url].cloud = cloud;

        // NOTE: for the SyncManager (on the MAIN thread), there's no UI to cause an update
        //  to a Cloud, so if we're here, it's because something happened on the RENDERER
        //  thread, that cause a Cloud to be updated, which cause the CloudStore to be
        //  updated, which caused a write to cloud-store.json, which Lens then synced
        //  (over IPC) to MAIN, which cause the CloudStore on MAIN to pick-up the change
        //  on disk, which cause our `autorun()` mobx hook to fire, and we ended-up here;
        //  all that to say, something presumably important about the Cloud has changed,
        //  so we best sync right away, if possible (maybe it was disconnected, and now
        //  we finally have new tokens and we're reconnected)
        const updatedDC = this.dataClouds[url];
        this.ipcMain.capture(
          'info',
          'SyncManager.updateClouds()',
          `DataCloud updated, will fetch data now if connected; dataCloud=${updatedDC}`
        );
        if (updatedDC.cloud.connected) {
          // NOTE: if the `cloud` was actually new, then the earlier assignment into
          //  the DC will have triggered a data fetch; otherwise, `cloud` is the same
          //  instance the DC already has and the assignment will have been a noop; either
          //  way, we trigger a data fetch now, and the DC will just ignore it if it's
          //  already fetching, so we won't double-up in the end
          updatedDC.fetchNow();
        }
      } else {
        // add new DC to store (initial fetch is scheduled by the DC itself)
        const dc = new DataCloud(cloud);
        dc.addEventListener(DATA_CLOUD_EVENTS.DATA_UPDATED, this.onDataUpdated);
        this.dataClouds[url] = dc;
      }
    });
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
   * [ASYNC] Updates a DataCloud's clusters in the Catalog.
   * @param {DataCloud} dataCloud
   */
  async updateClusters(dataCloud) {
    this.ipcMain.capture(
      'info',
      'SyncManager.updateClusters()',
      `Updating Catalog cluster entities; dataCloud=${dataCloud}`
    );

    const ACTION_ADDED = 'added';
    const ACTION_UPDATED = 'updated';

    //// GET KUBECONFIG FILE BASE PATH

    try {
      await this.determineBaseKubeConfigPath();
    } catch (err) {
      this.ipcMain.capture(
        'error',
        'SyncManager.updateClusters()',
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
    const promises = dataCloud.syncedNamespaces.flatMap((ns) => {
      return ns.clusters.map((cluster) => {
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
    });

    //// ADD, UPDATE, DELETE CATALOG ENTITIES

    return Promise.allSettled(promises).then((results) => {
      const storeModels = []; // new and updated models for SyncStore, omiting deleted ones
      const newEntities = []; // new entities for Catalog
      const knownClusterIds = {}; // map of string -> `true` for all valid/ready clusters
      let updateCount = 0;
      let deleteCount = 0;

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { cluster, model, catEntity, action } = result.value;

          knownClusterIds[cluster.uid] = true;
          storeModels.push(model); // new/updated/same, keep in SyncStore

          if (action === ACTION_ADDED) {
            this.ipcMain.capture(
              'log',
              'SyncManager.updateClusters()',
              `Adding new ${cluster} to Catalog`
            );
            newEntities.push(this.mkEntity(model));
          } else if (action === ACTION_UPDATED) {
            this.ipcMain.capture(
              'log',
              'SyncManager.updateClusters()',
              `Updating ${cluster} in Catalog: resourceVersion ${logValue(
                catEntity.metadata.resourceVersion
              )} -> ${logValue(cluster.resourceVersion)}`
            );
            this.updateEntity(catEntity, model);
            updateCount++;
          } else {
            this.ipcMain.capture(
              'log',
              'SyncManager.updateClusters()',
              `Skipping ${cluster} update: No changes detected`
            );
          }
        } else {
          this.ipcMain.capture(
            'warn',
            'SyncManager.updateClusters()',
            // NOTE: `reason.message` already has information about the cluster affected
            //  because it's an error message we generated in previous loop that created
            //  all the promises whose results we're now looping through
            `(Ignoring cluster) ${result.reason.message}`
          );
        }
      });

      // next, remove all cluster entities from the Catalog that no longer exist in the Cloud
      let idx;
      while (
        (idx = this.catalogSource.findIndex((entity) => {
          // NOTE: since it's our Catalog Source, it only contains our items, so we should
          //  never encounter a case where there's no mapped property
          const prop = kindtoNamespaceProp[entity.metadata.kind];
          return prop === 'clusters' && !knownClusterIds[entity.metadata.uid];
        })) >= 0
      ) {
        const entity = this.catalogSource[idx];
        this.ipcMain.capture(
          'log',
          'SyncManager.updateClusters()',
          `Removing entity ${entityToString(
            entity
          )} from Catalog and deleting kubeconfig file: Deleted in Cloud`
        );

        this.catalogSource.splice(idx, 1);
        deleteCount++;

        // no need to wait around for the promise to fulfill
        fs.rm(entity.spec.kubeconfigPath).catch((err) => {
          this.ipcMain.capture(
            'error',
            'SyncManager.updateClusters()',
            `Failed to delete kubeconfig file of ${entityToString(
              entity
            )}; error=${logValue(err.message)}`
          );
        });
      }

      // finally, add all the new entities to the Catalog
      newEntities.forEach((entity) => this.catalogSource.push(entity));

      this.ipcMain.capture(
        'info',
        'SyncManager.updateClusters()',
        `Added=${newEntities.length}, updated=${updateCount}, deleted=${deleteCount} cluster Catalog entities for dataCloud=${dataCloud}`
      );

      // save the models in the store
      syncStore.clusters = storeModels;

      this.ipcMain.capture(
        'info',
        'SyncManager.updateClusters()',
        `Done: Updated Catalog cluster entities for dataCloud=${dataCloud}`
      );
    });
    // NOTE: Promise.allSettled() does not fail
  }

  /**
   * Updates a Catalog Entity with metadata from a given Model.
   * @param {CatalogEntity} entity
   * @param {Object} model
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
      throw new Error(
        `Attempted to update ${entityToString(entity)} using ${modelToString(
          model
        )} with incompatible kinds`
      );
    }

    ['metadata', 'spec', 'status'].forEach(
      (prop) => (entity[prop] = model[prop])
    );
  }

  /**
   * Called whenever the `clouds` property of the CloudStore changes in some way
   *  (shallow or deep).
   * @param {Array<Cloud>} clouds Current/new CloudStore.clouds value (as configured
   *  by the reaction()).
   * @see https://mobx.js.org/reactions.html#reaction
   */
  onCloudStoreChange = (clouds) => {
    const cloudStoreTokens = Object.values(clouds).reduce((acc, cloud) => {
      acc[cloud.cloudUrl] = cloud.token;
      return acc;
    }, {});

    if (!isEqual(this.cloudTokens, cloudStoreTokens)) {
      this.ipcMain.capture(
        'info',
        'SyncManager.onCloudStoreChange()',
        'CloudStore.clouds has changed: Updating DataClouds'
      );

      const { cloudUrlsToAdd, cloudUrlsToUpdate, cloudUrlsToRemove } =
        this.triageCloudUrls(cloudStoreTokens);

      this.updateClouds({
        cloudStoreTokens,
        cloudUrlsToAdd,
        cloudUrlsToUpdate,
        cloudUrlsToRemove,
      });

      this.ipcMain.capture(
        'info',
        'SyncManager.onCloudStoreChange()',
        'Done: DataClouds updated'
      );
    }
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
            updateCount++;
            this.updateEntity(entity, model);
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
  onSyncNow = (event, cloudUrl) => {
    if (cloudUrl && this.dataClouds[cloudUrl]) {
      const dc = this.dataClouds[cloudUrl];
      if (dc.cloud.connected && !dc.fetching) {
        this.ipcMain.capture(
          'info',
          'SyncManager.onSyncNow()',
          `Syncing now; dataCloud=${dc}`
        );
        dc.fetchNow();
      } else {
        this.ipcMain.capture(
          'info',
          'SyncManager.onSyncNow()',
          `Cannot sync now: Cloud is either not connected or currently syncing; dataCloud=${dc}`
        );
      }
    } else {
      this.ipcMain.capture(
        'error',
        'SyncManager.onSyncNow()',
        `Unknown Cloud; cloudUrl=${logValue(cloudUrl)}`
      );
    }
  };

  /**
   * Called whenever a DataCloud's data has been updated.
   * @param {DataCloud} dataCloud The updated DataCloud.
   */
  onDataUpdated = (dataCloud) => {
    const types = ['sshKeys', 'credentials', 'proxies', 'licenses'];
    this.ipcMain.capture(
      'info',
      'SyncManager.onDataUpdated()',
      `Updating Catalog [${types.join(
        ', '
      )}] entities for dataCloud=${dataCloud}`
    );

    types.forEach((type) => {
      const storeModels = []; // new and updated models for SyncStore, less deleted ones
      const newEntities = []; // new entities for Catalog
      const knownResourceIds = {}; // map of string -> `true` for all resources of this type
      let updateCount = 0;
      let deleteCount = 0;

      // start by determining what is new and what has been updated
      dataCloud.syncedNamespaces.forEach((ns) => {
        ns[type].forEach((resource) => {
          const model = resource.toModel();

          knownResourceIds[resource.uid] = true;
          storeModels.push(model); // new/updated/same, keep in SyncStore

          const catEntity = findEntity(this.catalogSource, model);
          if (catEntity) {
            // entity exists already in the Catalog: either same (no changes) or updated
            if (
              catEntity.metadata.resourceVersion === resource.resourceVersion
            ) {
              this.ipcMain.capture(
                'log',
                'SyncManager.onDataUpdated()',
                `Skipping ${resource} update: No changes detected`
              );
            } else {
              // something about that resource has changed since the last time we fetched it
              this.ipcMain.capture(
                'log',
                'SyncManager.onDataUpdated()',
                `Updating ${resource} in Catalog: resourceVersion ${logValue(
                  catEntity.metadata.resourceVersion
                )} -> ${logValue(resource.resourceVersion)}`
              );
              updateCount++;
              this.updateEntity(catEntity, model);
            }
          } else {
            // new entity we have discovered: add to Catalog
            this.ipcMain.capture(
              'log',
              'SyncManager.onDataUpdated()',
              `Adding new ${resource} to Catalog`
            );
            newEntities.push(this.mkEntity(model));
          }
        });
      });

      // next, remove all entities from the Catalog of this type that no longer exist in the Cloud
      let idx;
      while (
        (idx = this.catalogSource.findIndex((entity) => {
          // NOTE: since it's our Catalog Source, it only contains our items, so we should
          //  never encounter a case where there's no mapped property
          const prop = kindtoNamespaceProp[entity.metadata.kind];
          return prop === type && !knownResourceIds[entity.metadata.uid];
        })) >= 0
      ) {
        const entity = this.catalogSource[idx];
        this.ipcMain.capture(
          'log',
          'SyncManager.onDataUpdated()',
          `Removing entity ${entityToString(entity)} from Catalog: Deleted`
        );

        this.catalogSource.splice(idx, 1);
        deleteCount++;
      }

      // finally, add all the new entities to the Catalog
      newEntities.forEach((entity) => this.catalogSource.push(entity));

      this.ipcMain.capture(
        'info',
        'SyncManager.onDataUpdated()',
        `Added=${newEntities.length}, updated=${updateCount}, deleted=${deleteCount} ${type} Catalog entities for dataCloud=${dataCloud}`
      );

      // save the models in the store
      syncStore[type] = storeModels;
    });

    this.ipcMain.capture(
      'info',
      'SyncManager.onDataUpdated()',
      `Done: Updated Catalog [${types.join(
        ', '
      )}] entities for dataCloud=${dataCloud}`
    );

    this.updateClusters(dataCloud);
  };
}
