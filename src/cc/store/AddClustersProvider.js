//
// Provider for adding clusters to Lens
//

import React, { createContext, useContext, useState, useMemo } from 'react';
import { promises as fs } from 'fs';
import path from 'path';
import { AuthClient } from '../auth/clients/AuthClient';
import { Store } from '@k8slens/extensions';
import { kubeConfigTemplate } from '../templates';
import { AuthAccess } from '../auth/AuthAccess';

//
// Store
//

/** @returns {Object} A new store object in its initial state. */
const _mkNewStore = function () {
  return {
    loading: false, // {boolean} true if adding clusters
    loaded: false, // {boolean} true if the cluster add operation is done (regardless of error)
    error: undefined, // {string} if an error occurred while adding clusters; undefined otherwise
  };
};

// The store defines the initial state and contains the current state
const store = {
  ..._mkNewStore(),
};

//
// Internal Methods
//

/**
 * Creates a full clone of the `store`.
 * @returns {Object} Cloned store object.
 */
const _cloneStore = function () {
  return { ...store }; // only primitive props so no need to deep-clone.
};

/**
 * Forces an update to this context's state.
 * @param {function} setState Function to call to update the context's state.
 */
const _triggerContextUpdate = function (setState) {
  // NOTE: by deep-cloning the store, React will detect changes to the root object,
  //  as well as to any nested objects, triggering a render regardless of whether a
  //  component is depending on the root, or on one of its children
  setState(_cloneStore());
};

/**
 * Called when a state property has changed.
 * @param {function} setState Function to call to update the context's state.
 */
const _onStateChanged = function (setState) {
  _triggerContextUpdate(setState);
};

/**
 * Resets store state. Data will need to be reloaded.
 * @param {function} setState Function to call to update the context's state.
 * @param {boolean} [loading] True if resetting because data is loading; false if
 *  just resetting to initial state.
 */
const _reset = function (setState, loading = false) {
  Object.assign(store, _mkNewStore()); // replace all properties with totally new ones
  store.loading = loading;
  _onStateChanged(setState);
};

/**
 * [ASYNC] Gets access tokens for the specified cluster.
 * @param {Cluster} options.cluster
 * @param {string} options.baseUrl MCC URL. Must NOT end with a slash.
 * @param {Object} options.config MCC Config object.
 * @param {AuthAccess} options.username
 * @param {string} options.password
 * @param {boolean} [options.offline] If true, the refresh token generated for the
 *  clusters will be enabled for offline access. WARNING: This is less secure
 *  than a normal refresh token as it will never expire.
 * @returns {Promise<Object>} On success, `{authAccess: AuthAccess}`, a new AuthAccess
 *  object that contains the token information; on error, `{error: string}`.
 */
const _getClusterAccess = async function ({
  cluster,
  baseUrl,
  config,
  username,
  password,
  offline = false,
}) {
  const authClient = new AuthClient(baseUrl, config);

  const { error, body } = await authClient.getToken(
    username,
    password,
    offline,
    cluster.idpClientId
  );

  if (error) {
    return { error };
  }

  return {
    authAccess: new AuthAccess({
      ...body,
      username,
      password,
      idpClientId: cluster.idpClientId,
    }),
  };
};

/**
 * [ASYNC] Creates a kubeconfig file for the given cluster on the local disk.
 * @param {Cluster} options.cluster
 * @param {string} options.savePath Absolute path where kubeconfigs are to be saved.
 * @param {string} options.baseUrl MCC URL. Must NOT end with a slash.
 * @param {Object} options.config MCC Config object.
 * @param {AuthAccess} options.username
 * @param {string} options.password
 * @param {boolean} [options.offline] If true, the refresh token generated for the
 *  clusters will be enabled for offline access. WARNING: This is less secure
 *  than a normal refresh token as it will never expire.
 * @returns {Promise<Object>} On success, `{model: ClusterModel}`, a cluster model
 *  to use to add the cluster to Lens; on error, `{error: string}`.
 */
const _createClusterFile = async function ({
  cluster,
  savePath,
  baseUrl,
  config,
  username,
  password,
  offline = false,
}) {
  const errPrefix = `Failed to create kubeconfig file for cluster ${cluster.id}`;

  const { error: accessError, authAccess } = await _getClusterAccess({
    cluster,
    baseUrl,
    config,
    username,
    password,
    offline,
  });

  if (accessError) {
    return { error: `${errPrefix}: ${accessError}` };
  }

  const kc = kubeConfigTemplate({
    username: authAccess.username,
    token: authAccess.token,
    refreshToken: authAccess.refreshToken,
    cluster,
  });

  const kubeConfigPath = path.resolve(
    savePath,
    `${cluster.namespace}-${cluster.name}-${cluster.id}.json`
  );

  try {
    // overwrite if already exists for some reason (failed to delete last time?)
    await fs.writeFile(kubeConfigPath, JSON.stringify(kc, undefined, 2));
  } catch (err) {
    return { error: `${errPrefix}: ${err.message}` };
  }

  // id - unique id (up to extension to decide what it is)
  // contextName - used contextName in given kubeConfig
  // workspace: workspace id, all clusters need to belong to a workspace (there is “default” workspace always available)

  return {
    model: {
      kubeConfigPath,
      id: cluster.id, // can be anything provided it's unique
      contextName: kc.contexts[0].name, // must be same context name used in the kubeconfig file
      workspace: Store.workspaceStore.currentWorkspaceId,

      // ownerRef: unique ref/id (up to extension to decide what it is), if unset
      //  then Lens allows the user to remove the cluster; otherwise, only the
      //  extension itself can remove it
    },
  };
};

/**
 * [ASYNC] Add the specified clusters to Lens.
 * @param {Object} options
 * @param {Array<Cluster>} options.clusters Clusters to add.
 * @param {string} options.savePath Absolute path where kubeconfigs are to be saved.
 * @param {string} options.baseUrl MCC URL. Must NOT end with a slash.
 * @param {Object} options.config MCC Config object.
 * @param {AuthAccess} options.username Used to generate access tokens for MCC clusters.
 * @param {string} options.password User password.
 * @param {boolean} [options.offline] If true, the refresh token generated for the
 *  clusters will be enabled for offline access. WARNING: This is less secure
 *  than a normal refresh token as it will never expire.
 * @param {function} setState Function to call to update the context's state.
 */
const _addToLens = async function (
  { clusters, savePath, baseUrl, config, username, password, offline = false },
  setState
) {
  _reset(setState, true);

  const promises = clusters.map((cluster) =>
    _createClusterFile({
      cluster,
      savePath,
      baseUrl,
      config,
      username,
      password,
      offline,
    })
  );

  const results = await Promise.all(promises); // these promises are designed NOT to reject
  const failure = results.find((res) => !!res.error); // look for any errors, use first-found

  // abort if there's at least one error
  if (failure) {
    store.loading = false;
    store.loaded = true;
    store.error = failure.error;
  } else {
    results.forEach(({ model }) => {
      Store.clusterStore.addCluster(model);
    });

    store.loading = false;
    store.loaded = true;
  }

  _onStateChanged(setState);
};

//
// Provider Definition
//

const AddClustersContext = createContext();

export const useAddClusters = function () {
  const context = useContext(AddClustersContext);
  if (!context) {
    throw new Error(
      'useAddClusters must be used within an AddClustersProvider'
    );
  }

  // NOTE: `context` is the value of the `value` prop we set on the
  //  <AddClustersContext.Provider value={...}/> we return as the <AddClustersProvider/>
  //  component to wrap all children that should have access to the state (i.e.
  //  all the children that will be able to `useAddClusters()` to access the state)
  const [state, setState] = context;

  // this is what you actually get from `useAddClusters()` when you consume it
  return {
    state,

    //// ACTIONS

    actions: {
      /**
       * [ASYNC] Add the specified clusters to Lens.
       * @param {Object} options
       * @param {Array<Cluster>} options.clusters Clusters to add.
       * @param {string} options.savePath Absolute path where kubeconfigs are to be saved.
       * @param {string} options.baseUrl MCC URL. Must NOT end with a slash.
       * @param {Object} options.config MCC Config object.
       * @param {AuthAccess} options.username Used to generate access tokens for MCC clusters.
       * @param {string} options.password User password.
       * @param {boolean} [options.offline] If true, the refresh token generated for the
       *  clusters will be enabled for offline access. WARNING: This is less secure
       *  than a normal refresh token as it will never expire.
       */
      addToLens(options) {
        if (!store.loading && options.clusters.length > 0) {
          console.log(
            '[AddClustersProvider] adding %s clusters to %s...',
            options.clusters.length,
            options.savePath
          ); // DEBUG
          _addToLens(options, setState);
        }
      },

      /** Resets store state. Data will need to be reloaded. */
      reset() {
        if (!store.loading) {
          _reset(setState);
        }
      },
    },
  };
};

export const AddClustersProvider = function (props) {
  // NOTE: since the state is passed directly (by reference) into the context
  //  returned by the provider, even the initial state should be a clone of the
  //  `store` so that we consistently return a `state` property (in the context)
  //  that is a shallow clone of the `store`
  const [state, setState] = useState(_cloneStore());
  const value = useMemo(() => [state, setState], [state]);

  return <AddClustersContext.Provider value={value} {...props} />;
};
