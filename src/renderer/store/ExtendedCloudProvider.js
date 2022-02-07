import { createContext, useContext, useMemo, useState } from 'react';
import * as rtv from 'rtvjs';
import { ProviderStore } from './ProviderStore';
import { cloneDeepWith, isEqual } from 'lodash';
import { cloudStore } from '../../store/CloudStore';
import { ExtendedCloud } from '../../common/ExtendedCloud';
import { autorun } from 'mobx';

class ExtendedCloudProviderStore extends ProviderStore {
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
      { 'ExtendedCloudProvider.store': this.store },
      {
        'ExtendedCloudProvider.store': {
          // map of cloudUrl -> ExtendedCloud instance
          extendedClouds: [
            rtv.HASH_MAP,
            { $values: [rtv.CLASS_OBJECT, { ctor: ExtendedCloud }] },
          ],
          // map of cloudUrl -> Cloud access token
          tokens: [rtv.HASH_MAP, { $values: rtv.STRING }],
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

const pr = new ExtendedCloudProviderStore();

const ExtendedCloudContext = createContext();

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
const _updateStore = function ({
  cloudStoreTokens,
  cloudUrlsToAdd,
  cloudUrlsToUpdate,
  cloudUrlsToRemove,
}) {
  // update ExtendedCloudProvider state to current CloudStore tokens
  pr.store.tokens = cloudStoreTokens;

  cloudUrlsToRemove.forEach((url) => {
    // destroy and remove ExtendedCloud
    pr.store.extendedClouds[url].destroy();
    delete pr.store.extendedClouds[url];
  });

  cloudUrlsToAdd.concat(cloudUrlsToUpdate).forEach((url) => {
    const cloud = cloudStore.clouds[url];

    // if extendedCloud exists - update extendedCloud.cloud
    if (pr.store.extendedClouds[url]) {
      console.log(
        `******* ExtendedCloudProvider._updateStore(): updating cloud on ${
          pr.store.extendedClouds[url]
        }, (${
          pr.store.extendedClouds[url].cloud === cloud ? 'same' : 'new'
        }) cloud=${cloud}`
      ); // DEBUG LOG
      // NOTE: updating the EC's Cloud instance will cause the EC to fetch new data,
      //  IIF the `cloud` is actually a new instance at the same URL; it's not always
      //  new as the CloudStore listens for changes on each Cloud and triggers the
      //  `autorun()` Mobx binding in the ExtendedCloudProvider declaration whenever
      //  that happens, but we still make the assignment just in case it's new and
      //  leave it to the ExtendedCloud to optimize what it does if the instance is
      //  the same as it already has
      pr.store.extendedClouds[url].cloud = cloud;
    } else {
      // otherwise create new ExtendedCloud
      const extCl = new ExtendedCloud(cloud);
      // add new EC to store
      pr.store.extendedClouds[url] = extCl;
    }
  });

  // NOTE: there's no need to cause a Provider context update if all we did was
  //  update some ExtendedCloud instances because the store hasn't changed in that
  //  case -- components using these instances should already be listening for its
  //  various events to get notified when its data changes
  if (cloudUrlsToAdd.length > 0 || cloudUrlsToRemove.length > 0) {
    pr.onChange();
  }
};

export const useExtendedCloudData = function () {
  const context = useContext(ExtendedCloudContext);
  if (!context) {
    throw new Error(
      'useExtendedCloudData must be used within an ExtendedCloudProvider'
    );
  }

  // NOTE: `context` is the value of the `value` prop we set on the
  //  <ExtendedCloudContext.Provider value={...}/> we return as the <ExtendedCloudProvider/>
  //  component to wrap all children that should have access to the state (i.e.
  //  all the children that will be able to `useExtendedCloudData()` to access the state)
  const [state] = context;

  return {
    state,
  };
};

export const ExtendedCloudProvider = function (props) {
  // NOTE: since the state is passed directly (by reference) into the context
  //  returned by the provider, even the initial state should be a clone of the
  //  `store` so that we consistently return a `state` property (in the context)
  //  that is a shallow clone of the `store`
  const [state, setState] = useState(pr.clone());
  const value = useMemo(() => [state, setState], [state]);

  pr.setState = setState;
  // autorun calls on any cloudStore update (to often)
  autorun(() => {
    // DEBUG REMOVE? const cloudUrlsToUpdate = [];

    // @type {{ [index: string]: string }} Map of Cloud URL to token for
    //   the new (current) set of known Clouds stored on disk.
    const cloudStoreTokens = Object.values(cloudStore.clouds).reduce(
      (acc, cloud) => {
        acc[cloud.cloudUrl] = cloud.token;
        return acc;
      },
      {}
    );
    // DEBUG REMOVE no longer necessary because of _triageCloudUrls()
    // compare Cloud tokens between what's in CloudStore and what's in our current state
    // Cloud tokens get refreshed every ~5 minutes, so the tokens will change, and we'll
    //  know that the Cloud was updated
    // const cloudStoreTokens = Object.values(cloudStore.clouds).reduce((acc, cloud) => {
    //   const { cloudUrl, token } = cloud;
    //   acc[cloudUrl] = token;
    //   if (token !== pr?.store?.tokens?.[cloudUrl]) { // cloud be totally new Cloud, or existing one
    //     cloudUrlsToUpdate.push(cloudUrl);
    //   }
    //   return acc;
    // }, {});

    // compare tokens from cloudStore.clouds and tokens in ExtendedCloudProvider state
    //  at previous change in context
    if (!isEqual(pr.store.tokens, cloudStoreTokens)) {
      const { cloudUrlsToAdd, cloudUrlsToUpdate, cloudUrlsToRemove } =
        _triageCloudUrls(cloudStoreTokens);
      console.log(
        '******* ExtendedCloudProvider.autorun(): cloudUrlsToAdd=[%s], cloudUrlsToUpdate=[%s], cloudUrlsToRemove=[%s]',
        cloudUrlsToAdd.join(', '),
        cloudUrlsToUpdate.join(', '),
        cloudUrlsToRemove.join(', ')
      ); // DEBUG LOG
      _updateStore({
        cloudStoreTokens,
        cloudUrlsToAdd,
        cloudUrlsToUpdate,
        cloudUrlsToRemove,
      });
    }
  });

  return <ExtendedCloudContext.Provider value={value} {...props} />;
};
