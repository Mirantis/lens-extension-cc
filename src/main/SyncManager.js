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
import { logString } from '../util/logger';
import * as consts from '../constants';
import { SshKeyEntity } from '../catalog/SshKeyEntity';
import { LicenseEntity } from '../catalog/LicenseEntity';
import { ProxyEntity } from '../catalog/ProxyEntity';
import { CredentialEntity } from '../catalog/CredentialEntity';

const {
  Catalog: { KubernetesCluster },
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
   * Update extended clouds in the store.
   * @param {Object} params
   * @param {{ [index: string]: string }} params.cloudStoreTokens Map of Cloud URL to token for
   *  the current set of known Clouds stored on disk.
   * @param {Array<string>} params.cloudUrlsToAdd List of new cloudUrls to be added
   * @param {Array<string>} params.cloudUrlsToUpdate List of cloudUrls that have to be updated
   * @param {Array<string>} params.cloudUrlsToRemove List of cloudUrls that must be removed
   * @private
   */
  updateStore({
    cloudStoreTokens,
    cloudUrlsToAdd,
    cloudUrlsToUpdate,
    cloudUrlsToRemove,
  }) {
    // update state to current CloudStore tokens
    this.cloudTokens = cloudStoreTokens;

    cloudUrlsToRemove.forEach((url) => {
      // TODO[PRODX-22269]: for each DC we're removing, we need to clean-up its kubeconfig files

      // destroy and remove DataCloud
      const dc = this.dataClouds[url];
      dc.removeEventListener(
        DATA_CLOUD_EVENTS.DATA_UPDATED,
        this.onDataUpdated
      );
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
          'log',
          'SyncManager.updateStore()',
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
   * Determines where a kubeconfig file will be stored.
   * @param {Cluster} cluster
   * @returns {string} Absolute path to the cluster's kubeconfig file.
   */
  getKubeConfigFilePath(cluster) {
    if (!this.baseKubeConfigPath) {
      throw new Error(
        `Unable to generate kubeconfig path for ${cluster}: Base path is unknown`
      );
    }

    const url = new URL(cluster.cloud.cloudUrl);
    return path.resolve(
      this.baseKubeConfigPath,
      'kubeconfigs',
      // NOTE: we're using the host because the user might change the Cloud's name, which
      //  would be difficult to sync up to in order not to lose files, and also keep them
      //  valid from Lens' standpoint; but the host should never change (if it did, the user
      //  would have to add a new Cloud with the new host, and remove the old one, which we
      //  handle just fine)
      url.host.replace(':', '-'), // includes port if specified
      cluster.namespace.name,
      `${cluster.name}_${cluster.uid}.yaml`
    );
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
          `Unknown catalog model kind=${logString(model.metadata.kind)}`
        );
    }
  }

  /**
   * [ASYNC] Updates a DataCloud's clusters in the Catalog.
   * @param {DataCloud} dataCloud
   */
  async updateClusters(dataCloud) {
    this.ipcMain.capture(
      'log',
      'SyncManager.updateClusters()',
      `Updating Catalog cluster entities; dataCloud=${dataCloud}`
    );

    // the base path can only be obtained from Lens asynchronously and isn't specific to any
    //  DataCloud; we determine it on first need to know it, and then we store it so we don't
    //  have to keep doing this
    if (!this.baseKubeConfigPath) {
      try {
        this.baseKubeConfigPath = await this.extension.getExtensionFileFolder();
      } catch (err) {
        this.ipcMain.capture(
          'error',
          'SyncManager.updateClusters()',
          `Failed to get Lens-designated extension file folder path; error="${err.message}"`
        );
        return;
      }
    }

    // promises resolve to `KubernetesCluster` entity MODELS, or reject to `Error` objects
    const promises = dataCloud.syncedNamespaces.flatMap((ns) =>
      ns.clusters.map((cluster) => {
        if (!cluster.ready) {
          return Promise.reject(
            new Error(
              `Cannot add/update cluster that is not ready; cluster=${cluster}`
            )
          );
        }

        const kubeConfig = cluster.getKubeConfig();
        const configFilePath = path.join(this.getKubeConfigFilePath(cluster));
        const model = cluster.toModel(configFilePath);
        const configDirPath = path.dirname(configFilePath);
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
                () => model,
                (err) => {
                  throw new Error(
                    `Failed to write kubeconfig file: Unable to add cluster; filePath=${logString(
                      configFilePath
                    )}, error=${logString(err.message)}, cluster=${cluster}`
                  );
                }
              ),
          (err) => {
            throw new Error(
              `Failed to create kubeconfig directory: Unable to add cluster; path=${logString(
                configDirPath
              )}, error=${logString(err.message)}, cluster=${cluster}`
            );
          }
        );
      })
    );

    // TODO[PRODX-22269]: make sync a lot more efficient instead of blind replace on every sync;
    //  need to delete old kubeconfig files too
    return Promise.allSettled(promises).then((results) => {
      // @type {Array<{ model: Object, entity: KubernetesCluster }>}
      const newSpecs = results
        .map((result) => {
          if (result.status === 'fulfilled') {
            return {
              model: result.value,
              entity: this.mkEntity(result.value),
            };
          }

          this.ipcMain.capture(
            'warn',
            'SyncManager.updateClusters()',
            `(Ignoring cluster) ${result.reason.message}`
          );
          return undefined;
        })
        .filter((spec) => !!spec); // remove the duds

      // first, remove all cluster entities from the Catalog
      let idx;
      while (
        (idx = this.catalogSource.findIndex((entity) => {
          // NOTE: since it's our Catalog Source, it only contains our items, so we should
          //  never encounter a case where there's no mapped property
          const prop = kindtoNamespaceProp[entity.metadata.kind];
          return 'clusters' === prop;
        })) >= 0
      ) {
        this.catalogSource.splice(idx, 1);
        // TODO[PRODX-22269]: also need to delete old kubeconfig files no longer used
      }

      this.ipcMain.capture(
        'log',
        'SyncManager.updateClusters()',
        `Adding ${newSpecs.length} cluster entities to Catalog; dataCloud=${dataCloud}`
      );

      // then, add all the new ones
      newSpecs.forEach(({ entity }) => {
        this.catalogSource.push(entity);
      });

      // finally, save the models in the store
      // TODO[PRODX-22269]: not great that we're looping the same list (newSpecs) twice...
      syncStore.clusters = newSpecs.map((spec) => spec.model);

      this.ipcMain.capture(
        'log',
        'SyncManager.updateClusters()',
        `Done: Updated Catalog cluster entities for dataCloud=${dataCloud}`
      );
    });
    // NOTE: Promise.allSettled() does not fail
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
        'log',
        'SyncManager.onCloudStoreChange()',
        'CloudStore.clouds has changed: Updating DataClouds'
      );

      const { cloudUrlsToAdd, cloudUrlsToUpdate, cloudUrlsToRemove } =
        this.triageCloudUrls(cloudStoreTokens);

      this.updateStore({
        cloudStoreTokens,
        cloudUrlsToAdd,
        cloudUrlsToUpdate,
        cloudUrlsToRemove,
      });

      this.ipcMain.capture(
        'log',
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
    // TODO[PRODX-22269]: this type of update will need to coordinate with DataCloud data updates
    this.ipcMain.capture(
      'log',
      'SyncManager.onSyncStoreChange()',
      'SyncStore state has changed: Updating Catalog'
    );

    Object.keys(state).forEach((type) => {
      const models = state[type];

      // first, remove all entities from the Catalog of this type
      let idx;
      while (
        (idx = this.catalogSource.findIndex((entity) => {
          // NOTE: since it's our Catalog Source, it only contains our items, so we should
          //  never encounter a case where there's no mapped property
          const prop = kindToSyncStoreProp[entity.metadata.kind];
          return type === prop;
        })) >= 0
      ) {
        this.catalogSource.splice(idx, 1);
      }

      this.ipcMain.capture(
        'log',
        'SyncManager.onSyncStoreChange()',
        `Adding ${models.length} ${type} entities to Catalog`
      );

      // then, add new entities into the Catalog
      models.forEach((model) => {
        const entity = this.mkEntity(model);
        this.catalogSource.push(entity);
      });
    });

    this.ipcMain.capture(
      'log',
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
          'log',
          'SyncManager.onSyncNow()',
          `Syncing now; dataCloud=${dc}`
        );
        dc.fetchNow();
      } else {
        this.ipcMain.capture(
          'log',
          'SyncManager.onSyncNow()',
          `Cannot sync now: Cloud is either not connected or currently syncing; dataCloud=${dc}`
        );
      }
    } else {
      this.ipcMain.capture(
        'error',
        'SyncManager.onSyncNow()',
        `Unknown Cloud; cloudUrl=${logString(cloudUrl)}`
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
      'log',
      'SyncManager.onDataUpdated()',
      `Updating Catalog [${types.join(
        ', '
      )}] entities for dataCloud=${dataCloud}`
    );

    // TODO[PRODX-22269]: make sync a lot more efficient instead of blind replace on every sync
    types.forEach((type) => {
      const newModels = [];
      const newEntities = dataCloud.syncedNamespaces.flatMap((ns) =>
        ns[type].map((apiType) => {
          const model = apiType.toModel();
          newModels.push(model);
          return this.mkEntity(model);
        })
      );

      // first, remove all entities from the Catalog of this type
      let idx;
      while (
        (idx = this.catalogSource.findIndex((entity) => {
          // NOTE: since it's our Catalog Source, it only contains our items, so we should
          //  never encounter a case where there's no mapped property
          const prop = kindtoNamespaceProp[entity.metadata.kind];
          return type === prop;
        })) >= 0
      ) {
        this.catalogSource.splice(idx, 1);
      }

      this.ipcMain.capture(
        'log',
        'SyncManager.onDataUpdated()',
        `Adding ${newEntities.length} ${type} entities to Catalog; dataCloud=${dataCloud}`
      );

      // then, add all the new ones
      newEntities.forEach((entity) => this.catalogSource.push(entity));

      // save the models in the store
      syncStore[type] = newModels;
    });

    this.ipcMain.capture(
      'log',
      'SyncManager.onDataUpdated()',
      `Done: Updated Catalog [${types.join(
        ', '
      )}] entities for dataCloud=${dataCloud}`
    );

    this.updateClusters(dataCloud);
  };
}
