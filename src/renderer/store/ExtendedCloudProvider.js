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
 * @param {Object} tokens {[cloudUrl]: [token]} pairs
 * @return {T[]|*[]} return empty array or cloudUrls that need to be removed
 * @private
 */
const _deleteCloudCheck = (tokens) => {
  const newCloudUrls = Object.keys(tokens || {});
  const prevCloudUrls = Object.keys(pr.store.tokens || {});
  if (newCloudUrls.length < prevCloudUrls.length) {
    return prevCloudUrls.filter((v) => !newCloudUrls.includes(v));
  }
  return [];
};

/**
 * @desc update extendedClouds
 * @param {Object} tokens, contains `[cloudUrl]: token` pairs
 * @param {Array<string>} cloudUrlsToUpdate, list of cloudUrls that has to be updated
 * @param {Array<string>} cloudsUrlsToDelete, list of cloudUrls that has to be updated
 * @private
 */
const _loadData = function (tokens, cloudUrlsToUpdate, cloudsUrlsToDelete) {
  if (cloudsUrlsToDelete?.length) {
    cloudsUrlsToDelete.forEach((url) => {
      // stop setInterval, just in case and remove EC
      pr.store.extendedClouds[url].stopUpdateCloudByTimeOut();
      delete pr.store.extendedClouds[url];
    });
  }

  const cloudUrls = cloudUrlsToUpdate?.length
    ? cloudUrlsToUpdate
    : Object.keys(cloudStore.clouds);

  pr.store.tokens = tokens;
  cloudUrls.forEach(async (url) => {
    const cloud = cloudStore.clouds[url];
    // if extendedCloud exists - replace extendedCloud.cloud
    if(pr.store.extendedClouds[url]) {
      pr.store.extendedClouds[url].cloud = cloud;
    } else {
      // otherwise create new ExtendedCloud
      const extCl = new ExtendedCloud(cloud);
      // add new EC to store
      pr.store.extendedClouds[url] = extCl;
      // if it's connected - start fetch data by interval
      if (extCl.cloud.isConnected()) {
        extCl.startUpdateCloudByTimeOut();
      }
    }
  });
  pr.onChange();
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
      const cloudsUrlsToDelete = _deleteCloudCheck(tokens);
      _loadData(tokens, cloudUrlsToUpdate, cloudsUrlsToDelete);
    }
  });

  return <ExtendedCloudContext.Provider value={value} {...props} />;
};
