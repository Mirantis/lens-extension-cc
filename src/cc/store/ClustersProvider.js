//
// Provider (Store) for Namespace and Cluster API data
//

import React, { createContext, useContext, useState, useMemo } from 'react';
import { cloneDeepWith, filter, find } from 'lodash';
import { Namespace } from './Namespace';
import { Cluster } from './Cluster';
import { authedRequest, extractJwtPayload } from '../auth/authUtil';

//
// Store
//

/** @returns {Object} A new store object in its initial state. */
const _mkNewStore = function () {
  return {
    loading: false, // {boolean} true if data is being loaded
    loaded: false, // {boolean} true if data has been loaded (regardless of error)
    error: undefined, // {string} if a load error occurred; undefined otherwise
    data: {
      namespaces: [], // {Array<Namespace>}
      clusters: [], // {Array<Cluster>} use `Cluster.namespace` to find groups
    },
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
  return cloneDeepWith(store, (value, key) => {
    if (key === 'data') {
      // instead of letting Lodash dig deep into this object, shallow-clone it
      //  since we don't actively set any properties beneath it's immediate ones
      return { ...value };
    }
    // else, let Lodash do the cloning
  });
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
 * Deserialize the raw list of namespace data from the API into Namespace objects.
 * @param {Object} body Data response from /list/namespace API.
 * @returns {Array<Namespace>} Array of Namespace objects.
 */
const _deserializeNamespacesList = function (body) {
  if (!body || !Array.isArray(body.items)) {
    return { error: 'Failed to parse namespace data: Unexpected data format.' };
  }

  return { data: body.items.map((item) => new Namespace(item)) };
};

/**
 * [ASYNC] Get all existing namespaces from the management cluster.
 * @param {string} baseUrl MCC URL. Must NOT end with a slash.
 * @param {Object} config MCC Configuration object.
 * @param {AuthState} authState An AuthState object. Tokens will be updated/cleared
 *  if necessary.
 * @returns {Promise<Object>} On success `{ namespaces: Array<Namespace< }`;
 *  on error `{error: string}`.
 */
const _fetchNamespaces = async function (baseUrl, config, authState) {
  const { error, body } = await authedRequest({
    baseUrl,
    authState,
    config,
    method: 'list',
    entity: 'namespace',
  });

  if (error) {
    return { error };
  }

  const { data, error: dsError } = _deserializeNamespacesList(body);
  if (dsError) {
    return { error: dsError };
  }

  const userRoles = extractJwtPayload(authState.token).iam_roles || [];

  const hasReadPermissions = (name) =>
    userRoles.includes(`m:kaas:${name}@reader`) ||
    userRoles.includes(`m:kaas:${name}@writer`);

  // always ignore the default namespace (since it could have multiple clusters
  //  with various names that all shouldn't be used directly), plus any other
  //  ones that are configured to be ignored
  const ignoredNamespaces = ['default', ...config.ignoredNamespaces];

  const namespaces = filter(
    data,
    (ns) => !ignoredNamespaces.includes(ns.name) && hasReadPermissions(ns.name)
  );

  return { namespaces };
};

/**
 * Deserialize the raw list of cluster data from the API into Cluster objects.
 * @param {Object} body Data response from /list/cluster API.
 * @returns {Array<Cluster>} Array of Cluster objects.
 */
const _deserializeClustersList = function (body) {
  if (!body || !Array.isArray(body.items)) {
    return { error: 'Failed to parse cluster data: Unexpected data format.' };
  }

  return { data: body.items.map((item) => new Cluster(item)) };
};

/**
 * [ASYNC] Get all existing clusters from the management cluster, for each namespace
 *  specified.
 * @param {string} baseUrl MCC URL. Must NOT end with a slash.
 * @param {Object} config MCC Configuration object.
 * @param {AuthState} authState An AuthState object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<string>} namespaces List of namespace NAMES for which to retrieve
 *  clusters.
 * @returns {Promise<Object>} On success `{ clusters: Array<Cluster< }` where the
 *  list of clusters is flat and in the order of the specified namespaces (use
 *  `Cluster.namespace` to identify which cluster belongs to which namespace);
 *  on error `{error: string}`. The error will be the first-found error out of
 *  all namespaces on which cluster retrieval was attempted.
 */
const _fetchClusters = async function (baseUrl, config, authState, namespaces) {
  const results = await Promise.all(
    namespaces.map((namespaceName) =>
      authedRequest({
        baseUrl,
        authState,
        config,
        method: 'list',
        entity: 'cluster',
        args: { namespaceName }, // extra args
      })
    )
  );

  const errResult = find(results, (r) => !!r.error);
  if (errResult) {
    return { error: errResult.error };
  }

  let clusters = [];
  let dsError;

  results.every((result) => {
    const { data, error } = _deserializeClustersList(result.body);
    if (error) {
      dsError = { error };
      return false; // break
    }

    clusters = [...clusters, ...data];
    return true; // next
  });

  return dsError || { clusters };
};

/**
 * [ASYNC] Loads namespaces and clusters from the API.
 * @param {string} baseUrl MCC URL. Must NOT end with a slash.
 * @param {Object} config MCC Configuration object.
 * @param {AuthState} authState Current authentication information. This
 *  instance MAY be updated if a token refresh is required during the load.
 * @param {function} setState Function to call to update the context's state.
 */
const _loadData = async function (baseUrl, config, authState, setState) {
  _reset(setState, true);

  const nsResults = await _fetchNamespaces(baseUrl, config, authState);

  if (nsResults.error) {
    store.loading = false;
    store.loaded = true;
    store.error = nsResults.error;
  } else {
    store.data.namespaces = nsResults.namespaces;

    const namespaces = store.data.namespaces.map((ns) => ns.name);
    const clResults = await _fetchClusters(
      baseUrl,
      config,
      authState,
      namespaces
    );

    store.loading = false;
    store.loaded = true;

    if (clResults.error) {
      store.error = clResults.error;
    } else {
      store.data.clusters = clResults.clusters;
    }
  }

  console.log('[ClustersProvider._loadData] store:', store); // DEBUG

  _onStateChanged(setState);
};

//
// Provider Definition
//

const ClustersContext = createContext();

export const useClusters = function () {
  const context = useContext(ClustersContext);
  if (!context) {
    throw new Error('useClusters must be used within an ClustersProvider');
  }

  // NOTE: `context` is the value of the `value` prop we set on the
  //  <ClustersContext.Provider value={...}/> we return as the <ClustersProvider/>
  //  component to wrap all children that should have access to the state (i.e.
  //  all the children that will be able to `useClusters()` to access the state)
  const [state, setState] = context;

  // this is what you actually get from `useClusters()` when you consume it
  return {
    state,

    //// ACTIONS

    actions: {
      /**
       * [ASYNC] Loads namespaces and clusters.
       * @param {string} baseUrl MCC URL. Must NOT end with a slash.
       * @param {Object} config MCC Configuration object.
       * @param {AuthState} authState Current authentication information. This
       *  instance MAY be updated if a token refresh is required during the load.
       */
      load(baseUrl, config, authState) {
        if (!store.loading) {
          console.log('[ClusterProvider] loading...'); // DEBUG
          _loadData(baseUrl, config, authState, setState);
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

export const ClustersProvider = function (props) {
  // NOTE: since the state is passed directly (by reference) into the context
  //  returned by the provider, even the initial state should be a clone of the
  //  `store` so that we consistently return a `state` property (in the context)
  //  that is a shallow clone of the `store`
  const [state, setState] = useState(_cloneStore());
  const value = useMemo(() => [state, setState], [state]);

  return <ClustersContext.Provider value={value} {...props} />;
};
