import { Common } from '@k8slens/extensions';
import { autorun } from 'mobx';
import * as rtv from 'rtvjs';
import { isEqual } from 'lodash';
import { DATA_CLOUD_EVENTS, DataCloud } from '../common/DataCloud';
import { cloudStore } from '../store/CloudStore';
import { apiKinds } from '../api/apiConstants';
import { logString } from '../util/logger';
import * as consts from '../constants';

const { Singleton } = Common.Util;

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
 * Synchronizes MCC namespaces with the Lens Catalog.
 * @class SyncManager
 */
export class SyncManager extends Singleton {
  /**
   * @param {Array<CatalogEntity>} catalogSource Registered Lens Catalog source.
   * @param {IpcMain} ipcMain Singleton instance for sending/receiving messages to/from Renderer.
   * @constructor
   */
  constructor(catalogSource, ipcMain) {
    super();

    let _cloudTokens = {};
    let _dataClouds = {};

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
              { cloudTokens: [rtv.HASH_MAP, { $values: rtv.STRING }] }
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

    //// Initialize

    ipcMain.handle(consts.ipcEvents.invoke.SYNC_NOW, this.onSyncNow);

    // mobx binding called whenever the CloudStore's `clouds` property changes
    autorun(() => {
      const cloudStoreTokens = Object.values(cloudStore.clouds).reduce(
        (acc, cloud) => {
          acc[cloud.cloudUrl] = cloud.token;
          return acc;
        },
        {}
      );

      if (!isEqual(this.cloudTokens, cloudStoreTokens)) {
        const { cloudUrlsToAdd, cloudUrlsToUpdate, cloudUrlsToRemove } =
          this.triageCloudUrls(cloudStoreTokens);

        this.updateStore({
          cloudStoreTokens,
          cloudUrlsToAdd,
          cloudUrlsToUpdate,
          cloudUrlsToRemove,
        });
      }
    });
  }

  /**
   * Triages current Cloud URLs into 3 lists: new, updated, and deleted.
   * @param {{ [index: string]: string }} cloudStoreTokens Map of Cloud URL to token for
   *  the current set of known Clouds stored on disk.
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
      if (cloudStoreTokens[providerUrl]) {
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
        if (!this.cloudTokens[curUrl]) {
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
      // destroy and remove DataCloud
      this.dataClouds[url].removeEventListener(
        DATA_CLOUD_EVENTS.DATA_UPDATED,
        this.onDataUpdated
      );
      this.dataClouds[url].destroy();
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
   * @param {DataCloud} dc The updated DataCloud.
   */
  onDataUpdated = (dc) => {
    this.ipcMain.capture(
      'log',
      'SyncManager.onDataUpdated()',
      `Updating Catalog entities for dataCloud=${dc}...`
    );

    // TODO[PRODX-22269]: make this a lot more efficient
    ['sshKeys', 'credentials', 'proxies', 'licenses'].forEach(
      // TODO[SyncManager] add 'clusters'
      (type) => {
        const newEntities = dc.syncedNamespaces.flatMap((ns) =>
          ns[type].map((apiType) => apiType.toEntity())
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
          `Adding ${newEntities.length} "${type}" entities to Catalog; dataCloud=${dc}`
        );

        // then, add all the new ones
        newEntities.forEach((entity) => this.catalogSource.push(entity));
      }
    );

    this.ipcMain.capture(
      'log',
      'SyncManager.onDataUpdated()',
      `Updated Catalog entities for dataCloud=${dc}`
    );
  };
}
