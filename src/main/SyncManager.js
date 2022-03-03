import * as rtv from 'rtvjs';
import { EXTENDED_CLOUD_EVENTS, ExtendedCloud } from '../common/ExtendedCloud';
import { cloudStore } from '../store/CloudStore';
import { syncStore } from '../store/SyncStore';

import { autorun, observable } from 'mobx';
import { isEqual } from 'lodash';
import * as consts from '../constants';
import { Common } from '@k8slens/extensions';

const { Singleton } = Common.Util;

// DEBUG TODO: this should be better defined; it's the name of entity property lists
//  on the API Namespace class...
const entityTypes = [
  'sshKeys',
  'credentials',
  'proxies',
  'licenses',
  'clusters',
];

export const catalogSource = observable.array([]);

export class SyncManager extends Singleton {
  constructor(extension) {
    super();

    extension.addCatalogSource(consts.catalog.source, catalogSource);

    let _cloudTokens = {};
    let _extendedClouds = {};

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
          DEV_ENV && rtv.verify(
            { cloudTokens: newValue },
            { cloudTokens: [rtv.HASH_MAP, { $values: rtv.STRING }] }
          );
          _cloudTokens = newValue;
        }
      }
    });

    /**
     * @readonly
     * @member {{ [index: string]: ExtendedCloud }} extendedClouds Map of Cloud URL to
     *  ExtendedCloud instance.
     *
     *  __READONLY__: Assign/delete properties on the object, but don't set the entire
     *   property as a whole.
     */
    Object.defineProperty(this, 'extendedClouds', {
      enumerable: true,
      get() {
        return _extendedClouds;
      },
    });

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
        //  it's updated (as far as we're concerned here in ExtendedCloudProvider)
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
      // destroy and remove ExtendedCloud
      this.extendedClouds[url].removeEventListener(
        EXTENDED_CLOUD_EVENTS.DATA_UPDATED,
        this.onDataUpdated
      );
      this.extendedClouds[url].destroy();
      delete this.extendedClouds[url];
    });

    cloudUrlsToAdd.concat(cloudUrlsToUpdate).forEach((url) => {
      const cloud = cloudStore.clouds[url];

      // if extendedCloud exists - update extendedCloud.cloud
      if (this.extendedClouds[url]) {
        // NOTE: updating the EC's Cloud instance will cause the EC to fetch new data,
        //  IIF the `cloud` is actually a new instance at the same URL; it's not always
        //  new as the CloudStore listens for changes on each Cloud and triggers the
        //  `autorun()` Mobx binding in the SyncManager declaration whenever
        //  that happens, but we still make the assignment just in case it's new and
        //  leave it to the ExtendedCloud to optimize what it does if the instance is
        //  the same as it already has
        this.extendedClouds[url].cloud = cloud;
      } else {
        // add new EC to store
        const extCloud = new ExtendedCloud(cloud);
        extCloud.addEventListener(EXTENDED_CLOUD_EVENTS.DATA_UPDATED, this.onDataUpdated);
        this.extendedClouds[url] = extCloud;
      }
    });
  }

  // DEBUG TODO: this part now needs to look at all EC.syncedNamespaces and create items
  //  in the catalog for everything, looking for items that exist purely by
  //  cloudUrl, namespace, and name, and replacing them with new instances
  onDataUpdated = (extCloud) => {
    entityTypes.map((type) => {
      syncStore.findAndUpdateEntities(
        type,
        extCloud.getEntities(type),
        extCloud.cloud.cloudUrl
      );
    });
  };
}
