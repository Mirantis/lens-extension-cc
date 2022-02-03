import { createContext, useContext, useMemo, useState } from 'react';
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
      tokens: null,
    };
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
 * @param {{ [index: string]: string }} currentTokens Map of Cloud URL to token for
 *  the current set of known Clouds stored on disk.
 * @return {{ newUrls: Array<string>, updatedUrls: Array<string>, oldUrls: Array<string> }}
 *  An object with `newUrls` being a list of new Cloud URLs to add, `oldUrls` a list
 *  of old Clouds to remove (deleted), and `updatedUrls` a list of Clouds that have
 *  changed but are still in use. Any of these lists could be empty.
 * @private
 */
const _triageCloudUrls = (currentTokens) => {
  const newUrls = [];
  const updatedUrls = [];
  const oldUrls = [];
  const storeTokens = pr.store.tokens || {};

  Object.keys(storeTokens).forEach((storeUrl) => {
    if (currentTokens[storeUrl]) {
      // stored URL is also in new set of URLs: updated
      updatedUrls.push(storeUrl);
    } else {
      // stored URL is not in new set: deleted
      oldUrls.push(storeUrl);
    }
  });

  const curCount = Object.keys(currentTokens).length;
  if (updatedUrls.length !== curCount && oldUrls.length !== curCount) {
    // there's at least one new URL (or none) in `currentTokens`
    Object.keys(currentTokens).forEach((curUrl) => {
      if (!storeTokens[curUrl]) {
        // not a stored/known URL: must be new
        newUrls.push(curUrl);
      }
    });
  }

  return { newUrls, updatedUrls, oldUrls };
};

/**
 * Update extended clouds in the store.
 * @param {{ [index: string]: string }} tokens Map of Cloud URL to token for
 *  the current set of known Clouds stored on disk.
 * @param {Array<string>} cloudUrlsToAdd List of new cloudUrls to be added
 * @param {Array<string>} cloudUrlsToUpdate List of cloudUrls that have to be updated
 * @param {Array<string>} cloudsUrlsToDelete List of cloudUrls that must be removed
 * @private
 */
const _updateStore = function (
  tokens,
  cloudUrlsToAdd,
  cloudUrlsToUpdate,
  cloudsUrlsToDelete
) {
  pr.store.tokens = tokens;

  cloudsUrlsToDelete.forEach((url) => {
    // destroy and remove EC
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
      //  IIF the `cloud` is actually new; it's not always new as the CloudStore listens
      //  for changes on each Cloud and triggers the `autorun()` Mobx binding whenever
      //  that happens, but we still make the assignment just in case it's new
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
  if (cloudUrlsToAdd.length > 0 || cloudsUrlsToDelete.length > 0) {
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
    const cloudUrlsToUpdate = [];

    // we need to take stable part to compare and observe
    // cloud.token, as I understand, is good for that
    // when we update cloud - we update its token (for now at least, this 'compare' part may be changed in the future)
    const tokens = Object.keys(cloudStore.clouds).reduce((acc, cloudUrl) => {
      acc[cloudUrl] = cloudStore.clouds[cloudUrl].token;
      if (cloudStore.clouds[cloudUrl].token !== pr?.store?.tokens?.[cloudUrl]) {
        cloudUrlsToUpdate.push(cloudUrl);
      }
      return acc;
    }, {});

    // compare tokens from cloudStore.clouds and tokens we store at previous change in context
    if (!isEqual(pr.store.tokens, tokens)) {
      const { newUrls, updatedUrls, oldUrls } = _triageCloudUrls(tokens);
      console.log(
        '******* ExtendedCloudProvider.autorun(): newUrls=[%s], updatedUrls=[%s], oldUrls=[%s]',
        newUrls.join(', '),
        updatedUrls.join(', '),
        oldUrls.join(', ')
      ); // DEBUG LOG
      _updateStore(tokens, newUrls, updatedUrls, oldUrls);
    }
  });

  return <ExtendedCloudContext.Provider value={value} {...props} />;
};
