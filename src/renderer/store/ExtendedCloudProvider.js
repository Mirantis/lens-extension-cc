import { createContext, useContext, useMemo, useState } from 'react';
import { ProviderStore } from './ProviderStore';
import { cloneDeepWith, isEqual } from 'lodash';
import { cloudStore } from '../../store/CloudStore';
import { ExtendedCloud, EXTENDED_CLOUD_EVENTS } from '../../common/ExtendedCloud';
import { autorun } from 'mobx';

class ExtendedCloudProviderStore extends ProviderStore {
  // @override
  makeNew() {
    return {
      ...super.makeNew(),
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

const updateSingleCloud = (extendedCloud) => {
  const { cloudUrl } = extendedCloud?.cloud || {}
  if(cloudUrl) {
    pr.store.extendedClouds[cloudUrl] = extendedCloud;
    pr.onChange();
  }
}

/**
 * @desc update extendedClouds
 * @param {Object} tokens, contains `[cloudUrl]: token` pairs
 * @param {Array<string>} cloudsNeedToBeUpdated, list of cloudUrls that has to be updated
 * @private
 */
const _loadData = function (tokens, cloudsNeedToBeUpdated) {
  let loadFinishedCount = 0;
  pr.loading = true;
  pr.loaded = false;
  pr.error = null;
  pr.onChange();
  const cloudUrls = cloudsNeedToBeUpdated?.length
    ? cloudsNeedToBeUpdated
    : Object.keys(cloudStore.clouds);
  pr.store.tokens = tokens;
  cloudUrls.forEach(async (url) => {
    const cloud = cloudStore.clouds[url];
    await cloud.loadConfig(); // we need to get config for getting namespaces and other at ExtendedCloud.init()
    const extCl = new ExtendedCloud(cloud);

    // if old cloud exist -> remove setInterval
    // remove eventListener
    if(pr.store.extendedClouds[url]) {
      pr.store.extendedClouds[url].stopUpdateCloudByTimeOut()
      pr.store.extendedClouds[url].removeEventListener(EXTENDED_CLOUD_EVENTS.DATA_UPDATED, updateSingleCloud)
    }
    extCl.addEventListener(EXTENDED_CLOUD_EVENTS.DATA_UPDATED, updateSingleCloud)
    extCl.startUpdateCloudByTimeOut();
    pr.store.extendedClouds[url] = extCl;
    // we need to know when all async promises are finished
    // so increase count and when it equal cloudUrls.length set valid loading/loader statuses
    loadFinishedCount += 1;
    if (cloudUrls.length === loadFinishedCount) {
      pr.loading = false;
      pr.loaded = true;
    }
    pr.onChange();
  });
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
    const cloudsNeedToBeUpdated = [];
    // we need to take stable part to compare and observe
    // cloud.token, as I understand, is good for that
    // when we update cloud - we update its token (for now at least, this 'compare' part may be changed in the future)
    const tokens = Object.keys(cloudStore.clouds).reduce((acc, cloudUrl) => {
      acc[cloudUrl] = cloudStore.clouds[cloudUrl].token;
      if (cloudStore.clouds[cloudUrl].token !== pr?.store?.tokens?.[cloudUrl]) {
        cloudsNeedToBeUpdated.push(cloudUrl);
      }
      return acc;
    }, {});
    // compare tokens from cloudStore.clouds and tokens we store at previous change in context
    if (!isEqual(pr.store.tokens, tokens) && !pr.loading) {
      _loadData(tokens, cloudsNeedToBeUpdated);
    }
  });

  return <ExtendedCloudContext.Provider value={value} {...props} />;
};
