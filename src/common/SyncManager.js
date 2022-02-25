import { EXTENDED_CLOUD_EVENTS, ExtendedCloud } from './ExtendedCloud';
import { cloudStore } from '../store/CloudStore';
import { syncStore } from '../store/SyncStore';

import { autorun, observable } from 'mobx';
import { isEqual } from 'lodash';
// import * as consts from '../constants';
import { Common } from '@k8slens/extensions';
const { Singleton } = Common.Util;

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
    // extension.addCatalogSource(consts.catalog.source, catalogSource);
    this.store = {
      extendedClouds: {},
      tokens: {},
    };
  }
  // here we need to connect syncStore, iterate it (need to know when iterate it! - detect changes), prepare items and push them to catalogSource
}

// autorun part
const listenFetchData = (extCloud) => {
  entityTypes.map((type) => {
    syncStore.findAndUpdateEntities(
      type,
      extCloud.getEntities(type),
      extCloud.cloud.cloudUrl
    );
  });
};

const _triageCloudUrls = (cloudStoreTokens) => {
  const store = SyncManager.getInstance().store;
  const cloudUrlsToAdd = [];
  const cloudUrlsToUpdate = [];
  const cloudUrlsToRemove = [];
  const providerTokens = store.tokens;

  Object.keys(providerTokens).forEach((providerUrl) => {
    if (cloudStoreTokens[providerUrl]) {
      // provider URL is also in CloudStore set of URLs: if the token has changed,
      //  it's updated (as far as we're concerned here in ExtendedCloudProvider)
      if (cloudStoreTokens[providerUrl] !== providerTokens[providerUrl]) {
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
      if (!providerTokens[curUrl]) {
        // not a stored/known URL: must be new
        cloudUrlsToAdd.push(curUrl);
      }
    });
  }

  return { cloudUrlsToAdd, cloudUrlsToUpdate, cloudUrlsToRemove };
};

const _updateStore = function ({
  cloudStoreTokens,
  cloudUrlsToAdd,
  cloudUrlsToUpdate,
  cloudUrlsToRemove,
}) {
  const store = SyncManager.getInstance().store;
  // update state to current CloudStore tokens
  store.tokens = cloudStoreTokens;

  cloudUrlsToRemove.forEach((url) => {
    // destroy and remove ExtendedCloud
    store.extendedClouds[url].destroy();
    store.extendedClouds[url].removeEventListener(
      EXTENDED_CLOUD_EVENTS.FETCH_DATA,
      listenFetchData
    );
    delete store.extendedClouds[url];
  });

  cloudUrlsToAdd.concat(cloudUrlsToUpdate).forEach((url) => {
    const cloud = cloudStore.clouds[url];

    // if extendedCloud exists - update extendedCloud.cloud
    if (store.extendedClouds[url]) {
      // NOTE: updating the EC's Cloud instance will cause the EC to fetch new data,
      //  IIF the `cloud` is actually a new instance at the same URL; it's not always
      //  new as the CloudStore listens for changes on each Cloud and triggers the
      //  `autorun()` Mobx binding in the SyncManager declaration whenever
      //  that happens, but we still make the assignment just in case it's new and
      //  leave it to the ExtendedCloud to optimize what it does if the instance is
      //  the same as it already has
      store.extendedClouds[url].cloud = cloud;
    } else {
      // add new EC to store
      const cl = new ExtendedCloud(cloud);
      cl.addEventListener(EXTENDED_CLOUD_EVENTS.FETCH_DATA, listenFetchData);
      store.extendedClouds[url] = cl;
    }
  });
};

autorun(() => {
  const cloudStoreTokens = Object.values(cloudStore.clouds).reduce(
    (acc, cloud) => {
      acc[cloud.cloudUrl] = cloud.token;
      return acc;
    },
    {}
  );
  const syncManager = SyncManager.getInstance();
  if (!isEqual(syncManager.store.tokens, cloudStoreTokens)) {
    const { cloudUrlsToAdd, cloudUrlsToUpdate, cloudUrlsToRemove } =
      _triageCloudUrls(cloudStoreTokens);
    _updateStore({
      cloudStoreTokens,
      cloudUrlsToAdd,
      cloudUrlsToUpdate,
      cloudUrlsToRemove,
    });
  }
});
