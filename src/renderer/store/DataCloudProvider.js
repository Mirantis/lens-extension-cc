import { createContext, useContext, useMemo, useState } from 'react';
import * as rtv from 'rtvjs';
import { ProviderStore } from './ProviderStore';
import { cloneDeepWith, isEqual } from 'lodash';
import { cloudStore } from '../../store/CloudStore';
import { DataCloud } from '../../common/DataCloud';
import { autorun } from 'mobx';

class DataCloudProviderStore extends ProviderStore {
  // @override
  makeNew() {
    return {
      extendedClouds: {},
      tokens: {},
    };
  }

  // @override
  validate() {
    rtv.verify(
      { 'DataCloudProvider.store': this.store },
      {
        'DataCloudProvider.store': {
          // map of cloudUrl -> DataCloud instance
          extendedClouds: [
            rtv.HASH_MAP,
            { $values: [rtv.CLASS_OBJECT, { ctor: DataCloud }] },
          ],
          // map of cloudUrl -> Cloud access token (could be `null` if the Cloud
          //  doesn't have any tokens yet, or its tokens get reset after
          //  getting disconnected)
          tokens: [rtv.HASH_MAP, { $values: [rtv.EXPECTED, rtv.STRING] }],
        },
      }
    );
  }

  // @override
  clone() {
    return cloneDeepWith(this.store, (value, key) => {
      if (key === 'extendedClouds') {
        // instead of letting Lodash dig deep into this object, shallow-clone it
        //  since we don't actively set any properties beneath it's immediate ones
        return { ...value };
      }
    });
  }
}

const pr = new DataCloudProviderStore();

const DataCloudContext = createContext();

/**
 * Triages current Cloud URLs into 3 lists: new, updated, and deleted.
 * @param {{ [index: string]: string }} cloudStoreTokens Map of Cloud URL to token for
 *  the current set of known Clouds stored on disk.
 * @return {{ cloudUrlsToAdd: Array<string>, cloudUrlsToUpdate: Array<string>, cloudUrlsToRemove: Array<string> }}
 *  An object with `cloudUrlsToAdd` being a list of new Cloud URLs to add, `cloudUrlsToRemove` a list
 *  of old Clouds to remove (deleted), and `cloudUrlsToUpdate` a list of Clouds that have
 *  changed but are still in use. Any of these lists could be empty.
 * @private
 */
const _triageCloudUrls = (cloudStoreTokens) => {
  const cloudUrlsToAdd = [];
  const cloudUrlsToUpdate = [];
  const cloudUrlsToRemove = [];
  const providerTokens = pr.store.tokens;

  Object.keys(providerTokens).forEach((providerUrl) => {
    if (cloudStoreTokens[providerUrl]) {
      // provider URL is also in CloudStore set of URLs: if the token has changed,
      //  it's updated (as far as we're concerned here in DataCloudProvider)
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

/**
 * Update data clouds in the store.
 * @param {Object} params
 * @param {{ [index: string]: string }} params.cloudStoreTokens Map of Cloud URL to token for
 *  the current set of known Clouds stored on disk.
 * @param {Array<string>} params.cloudUrlsToAdd List of new cloudUrls to be added
 * @param {Array<string>} params.cloudUrlsToUpdate List of cloudUrls that have to be updated
 * @param {Array<string>} params.cloudUrlsToRemove List of cloudUrls that must be removed
 * @private
 */
const _updateStore = function ({
  cloudStoreTokens,
  cloudUrlsToAdd,
  cloudUrlsToUpdate,
  cloudUrlsToRemove,
}) {
  // update DataCloudProvider state to current CloudStore tokens
  pr.store.tokens = cloudStoreTokens;

  cloudUrlsToRemove.forEach((url) => {
    // destroy and remove DataCloud
    pr.store.extendedClouds[url].destroy();
    delete pr.store.extendedClouds[url];
  });

  cloudUrlsToAdd.concat(cloudUrlsToUpdate).forEach((url) => {
    const cloud = cloudStore.clouds[url];

    // if extendedCloud exists - update extendedCloud.cloud
    if (pr.store.extendedClouds[url]) {
      // NOTE: updating the EC's Cloud instance will cause the EC to fetch new data,
      //  IIF the `cloud` is actually a new instance at the same URL; it's not always
      //  new as the CloudStore listens for changes on each Cloud and triggers the
      //  `autorun()` Mobx binding in the DataCloudProvider declaration whenever
      //  that happens, but we still make the assignment just in case it's new and
      //  leave it to the DataCloud to optimize what it does if the instance is
      //  the same as it already has
      pr.store.extendedClouds[url].cloud = cloud;
    } else {
      // otherwise create new DataCloud
      const dc = new DataCloud(cloud);
      // add new EC to store
      pr.store.extendedClouds[url] = dc;
    }
  });

  // NOTE: there's no need to cause a Provider context update if all we did was
  //  update some DataCloud instances because the store hasn't changed in that
  //  case -- components using these instances should already be listening for its
  //  various events to get notified when its data changes
  if (cloudUrlsToAdd.length > 0 || cloudUrlsToRemove.length > 0) {
    pr.onChange();
  }
};

export const useDataCloudData = function () {
  const context = useContext(DataCloudContext);
  if (!context) {
    throw new Error(
      'useDataCloudData must be used within an DataCloudProvider'
    );
  }

  // NOTE: `context` is the value of the `value` prop we set on the
  //  <DataCloudContext.Provider value={...}/> we return as the <DataCloudProvider/>
  //  component to wrap all children that should have access to the state (i.e.
  //  all the children that will be able to `useDataCloudData()` to access the state)
  const [state] = context;

  return {
    state,
  };
};

export const DataCloudProvider = function (props) {
  // NOTE: since the state is passed directly (by reference) into the context
  //  returned by the provider, even the initial state should be a clone of the
  //  `store` so that we consistently return a `state` property (in the context)
  //  that is a shallow clone of the `store`
  const [state, setState] = useState(pr.clone());
  const value = useMemo(() => [state, setState], [state]);

  pr.setState = setState;
  // autorun calls on any cloudStore update (to often)
  autorun(() => {
    // @type {{ [index: string]: string }} Map of Cloud URL to token for
    //   the new (current) set of known Clouds stored on disk.
    const cloudStoreTokens = Object.values(cloudStore.clouds).reduce(
      (acc, cloud) => {
        acc[cloud.cloudUrl] = cloud.token;
        return acc;
      },
      {}
    );

    // compare tokens from cloudStore.clouds and tokens in DataCloudProvider state
    //  at previous change in context
    if (!isEqual(pr.store.tokens, cloudStoreTokens)) {
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

  return <DataCloudContext.Provider value={value} {...props} />;
};
