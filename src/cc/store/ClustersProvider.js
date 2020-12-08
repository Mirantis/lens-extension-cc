//
// Provider (Store) for Namespace and Cluster API data
//

import React, { createContext, useContext, useState, useMemo } from 'react';
import { cloneDeepWith, filter, find } from 'lodash';
import { Namespace } from './Namespace';
import { Cluster } from './Cluster';
import { authedRequest, extractJwtPayload } from '../auth/authUtil';
import * as strings from '../../strings';
import { ProviderStore } from './ProviderStore';
import pkg from '../../../package.json';

//
// Store
//

class ClustersProviderStore extends ProviderStore {
  // @override
  makeNew() {
    return {
      ...super.makeNew(),
      data: {
        namespaces: [], // {Array<Namespace>}
        clusters: [], // {Array<Cluster>} use `Cluster.namespace` to find groups
      },
    };
  }

  // @override
  clone() {
    return cloneDeepWith(this.store, (value, key) => {
      if (key === 'data') {
        // instead of letting Lodash dig deep into this object, shallow-clone it
        //  since we don't actively set any properties beneath it's immediate ones
        return { ...value };
      }
      // else, let Lodash do the cloning
    });
  }
}

const pr = new ClustersProviderStore();

//
// Internal Methods
//

/**
 * Deserialize the raw list of namespace data from the API into Namespace objects.
 * @param {Object} body Data response from /list/namespace API.
 * @returns {Array<Namespace>} Array of Namespace objects.
 */
const _deserializeNamespacesList = function (body) {
  if (!body || !Array.isArray(body.items)) {
    return { error: strings.clustersProvider.errors.invalidNamespacePayload() };
  }

  try {
    return { data: body.items.map((item) => new Namespace(item)) };
  } catch (err) {
    // eslint-disable-next-line no-console -- OK to show errors
    console.error(
      `[${pkg.name}/ClustersProvider._deserializeNamespacesList()] ERROR: ${err.message}`,
      err
    );
    return { error: strings.clustersProvider.errors.invalidNamespace() };
  }
};

/**
 * [ASYNC] Get all existing namespaces from the management cluster.
 * @param {string} baseUrl MCC URL. Must NOT end with a slash.
 * @param {Object} config MCC Configuration object.
 * @param {AuthAccess} authAccess An AuthAccess object. Tokens will be updated/cleared
 *  if necessary.
 * @returns {Promise<Object>} On success `{ namespaces: Array<Namespace< }`;
 *  on error `{error: string}`.
 */
const _fetchNamespaces = async function (baseUrl, config, authAccess) {
  const { error, body } = await authedRequest({
    baseUrl,
    authAccess,
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

  const userRoles = extractJwtPayload(authAccess.token).iam_roles || [];

  const hasReadPermissions = (name) =>
    userRoles.includes(`m:kaas:${name}@reader`) ||
    userRoles.includes(`m:kaas:${name}@writer`);

  const ignoredNamespaces = config.ignoredNamespaces || [];
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
    return { error: strings.clusterProvider.error.invalidClusterPayload() };
  }

  try {
    return { data: body.items.map((item) => new Cluster(item)) };
  } catch (err) {
    // eslint-disable-next-line no-console -- OK to show errors
    console.error(
      `[${pkg.name}/ClustersProvider._deserializeClustersList()] ERROR: ${err.message}`,
      err
    );
    return { error: strings.clustersProvider.errors.invalidCluster() };
  }
};

/**
 * [ASYNC] Get all existing clusters from the management cluster, for each namespace
 *  specified.
 * @param {string} baseUrl MCC URL. Must NOT end with a slash.
 * @param {Object} config MCC Configuration object.
 * @param {AuthAccess} authAccess An AuthAccess object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<string>} namespaces List of namespace NAMES for which to retrieve
 *  clusters.
 * @returns {Promise<Object>} On success `{ clusters: Array<Cluster< }` where the
 *  list of clusters is flat and in the order of the specified namespaces (use
 *  `Cluster.namespace` to identify which cluster belongs to which namespace);
 *  on error `{error: string}`. The error will be the first-found error out of
 *  all namespaces on which cluster retrieval was attempted.
 */
const _fetchClusters = async function (
  baseUrl,
  config,
  authAccess,
  namespaces
) {
  const results = await Promise.all(
    namespaces.map((namespaceName) =>
      authedRequest({
        baseUrl,
        authAccess,
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
 * @param {AuthAccess} authAccess Current authentication information. This
 *  instance MAY be updated if a token refresh is required during the load.
 */
const _loadData = async function (baseUrl, config, authAccess) {
  pr.reset(true);

  const nsResults = await _fetchNamespaces(baseUrl, config, authAccess);

  if (nsResults.error) {
    pr.store.loading = false;
    pr.store.loaded = true;
    pr.store.error = nsResults.error;
  } else {
    pr.store.data.namespaces = nsResults.namespaces;

    const namespaces = pr.store.data.namespaces.map((ns) => ns.name);
    const clResults = await _fetchClusters(
      baseUrl,
      config,
      authAccess,
      namespaces
    );

    pr.store.loading = false;
    pr.store.loaded = true;

    if (clResults.error) {
      pr.store.error = clResults.error;
    } else {
      pr.store.data.clusters = clResults.clusters;
    }
  }

  pr.notifyIfError();
  pr.onChange();
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
  const [state] = context;

  // this is what you actually get from `useClusters()` when you consume it
  return {
    state,

    //// ACTIONS

    actions: {
      /**
       * [ASYNC] Loads namespaces and clusters.
       * @param {string} baseUrl MCC URL. Must NOT end with a slash.
       * @param {Object} config MCC Configuration object.
       * @param {AuthAccess} authAccess Current authentication information. This
       *  instance MAY be updated if a token refresh is required during the load.
       */
      load(baseUrl, config, authAccess) {
        if (!pr.store.loading) {
          _loadData(baseUrl, config, authAccess);
        }
      },

      /** Resets store state. Data will need to be reloaded. */
      reset() {
        if (!pr.store.loading) {
          pr.reset();
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
  const [state, setState] = useState(pr.clone());
  const value = useMemo(() => [state, setState], [state]);

  pr.setState = setState;

  return <ClustersContext.Provider value={value} {...props} />;
};
