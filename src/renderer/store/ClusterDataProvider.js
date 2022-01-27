//
// Provider (Store) for Namespace and Cluster API data
//

import { createContext, useContext, useState, useMemo } from 'react';
import { cloneDeepWith, filter, find } from 'lodash';
import { Namespace } from './Namespace';
import { Cluster } from './Cluster';
import { authedRequest, extractJwtPayload } from '../auth/authUtil';
import { ProviderStore } from './ProviderStore';
import * as strings from '../../strings';
import { logger } from '../../util/logger';

//
// Store
//

class ClusterDataProviderStore extends ProviderStore {
  // @override
  makeNew() {
    return {
      ...super.makeNew(),
      data: {
        namespaces: [], // @type {Array<Namespace>}

        // All clusters except any that are in progress of being deleted; use
        //  `Cluster.namespace` to find groups
        // @type {Array<Cluster>}
        clusters: [],
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

const pr = new ClusterDataProviderStore();

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
    return {
      error: strings.clusterDataProvider.error.invalidNamespacePayload(),
    };
  }

  return {
    data: body.items
      .map((item, idx) => {
        try {
          return new Namespace(item);
        } catch (err) {
          logger.error(
            'store/ClusterDataProvider._deserializeNamespacesList()',
            `Failed to deserialize namespace ${idx}: ${err.message}`,
            err
          );
          return undefined;
        }
      })
      .filter((cl) => !!cl), // eliminate invalid namespaces (`undefined` items)
  };
};

/**
 * [ASYNC] Get all existing namespaces from the management cluster.
 * @param {string} cloudUrl MCC URL. Must NOT end with a slash.
 * @param {Object} config MCC Configuration object.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<string>} [onlyNamespaces] If specified, only clusters from these
 *  namespaces will be loaded; otherwise, all clusters in all namespaces will
 *  be loaded.
 * @returns {Promise<Object>} On success `{ namespaces: Array<Namespace< }`;
 *  on error `{error: string}`.
 */
const _fetchNamespaces = async function (
  cloudUrl,
  config,
  cloud,
  onlyNamespaces
) {
  const { error, body } = await authedRequest({
    baseUrl: cloudUrl,
    cloud,
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

  const userRoles = extractJwtPayload(cloud.token).iam_roles || [];

  const hasReadPermissions = (name) =>
    userRoles.includes(`m:kaas:${name}@reader`) ||
    userRoles.includes(`m:kaas:${name}@writer`);

  const ignoredNamespaces = config.ignoredNamespaces || [];
  const namespaces = filter(
    data,
    (ns) =>
      !ignoredNamespaces.includes(ns.name) &&
      hasReadPermissions(ns.name) &&
      (!onlyNamespaces || onlyNamespaces.includes(ns.name))
  );

  return { namespaces };
};

/**
 * Deserialize the raw list of cluster data from the API into Cluster objects.
 * @param {Object} body Data response from /list/cluster API.
 * @param {Cloud} cloud The Cloud object used to access the clusters.
 * @returns {Array<Cluster>} Array of Cluster objects.
 */
const _deserializeClustersList = function (body, cloud) {
  if (!body || !Array.isArray(body.items)) {
    return { error: strings.clusterDataProvider.error.invalidClusterPayload() };
  }

  return {
    data: body.items
      .map((item, idx) => {
        try {
          return new Cluster(item, cloud.username);
        } catch (err) {
          logger.error(
            'ClusterDataProvider._deserializeClustersList()',
            `Failed to deserialize cluster ${idx} (namespace/name="${
              item?.metadata?.namespace ?? '<unknown>'
            }/${item?.metadata?.name ?? '<unknown>'}"): ${err.message}`,
            err
          );
          return undefined;
        }
      })
      .filter((cl) => !!cl), // eliminate invalid clusters (`undefined` items)
  };
};

/**
 * [ASYNC] Get all existing clusters from the management cluster, for each namespace
 *  specified.
 * @param {string} cloudUrl MCC URL. Must NOT end with a slash.
 * @param {Object} config MCC Configuration object.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<string>} namespaces List of namespace NAMES for which to retrieve
 *  clusters.
 * @returns {Promise<Object>} On success `{ clusters: Array<Cluster< }` where the
 *  list of clusters is flat and in the order of the specified namespaces (use
 *  `Cluster.namespace` to identify which cluster belongs to which namespace);
 *  on error `{error: string}`. The error will be the first-found error out of
 *  all namespaces on which cluster retrieval was attempted.
 */
const _fetchClusters = async function (cloudUrl, config, cloud, namespaces) {
  const results = await Promise.all(
    namespaces.map((namespaceName) =>
      authedRequest({
        baseUrl: cloudUrl,
        cloud,
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
    const { data, error } = _deserializeClustersList(result.body, cloud);
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
 * @param {Object} options
 * @param {string} options.cloudUrl MCC URL. Must NOT end with a slash.
 * @param {Object} options.config MCC Configuration object.
 * @param {Cloud} options.cloud Current authentication information. This
 *  instance MAY be updated if a token refresh is required during the load.
 * @param {Array<string>} [options.onlyNamespaces] If specified, only clusters from these
 *  namespaces will be loaded; otherwise, all clusters in all namespaces will
 *  be loaded.
 */
const _loadData = async function ({ cloudUrl, config, cloud, onlyNamespaces }) {
  pr.reset(true);

  const nsResults = await _fetchNamespaces(
    cloudUrl,
    config,
    cloud,
    onlyNamespaces
  );

  if (nsResults.error) {
    pr.loading = false;
    pr.loaded = true;
    pr.error = nsResults.error;
  } else {
    pr.store.data.namespaces = nsResults.namespaces;

    const namespaces = pr.store.data.namespaces.map((ns) => ns.name);
    const clResults = await _fetchClusters(cloudUrl, config, cloud, namespaces);

    pr.loading = false;
    pr.loaded = true;

    if (clResults.error) {
      pr.error = clResults.error;
    } else {
      pr.store.data.clusters = clResults.clusters.filter(
        (cluster) => !cluster.deleteInProgress
      );
    }
  }

  pr.notifyIfError();
  pr.onChange();
};

//
// Provider Definition
//

const ClustersContext = createContext();

export const useClusterData = function () {
  const context = useContext(ClustersContext);
  if (!context) {
    throw new Error(
      'useClusterData must be used within an ClusterDataProvider'
    );
  }

  // NOTE: `context` is the value of the `value` prop we set on the
  //  <ClustersContext.Provider value={...}/> we return as the <ClusterDataProvider/>
  //  component to wrap all children that should have access to the state (i.e.
  //  all the children that will be able to `useClusterData()` to access the state)
  const [state] = context;

  // this is what you actually get from `useClusterData()` when you consume it
  return {
    state,

    //// ACTIONS

    actions: {
      /**
       * [ASYNC] Loads namespaces and clusters.
       * @param {Object} options
       * @param {string} options.cloudUrl MCC URL. Must NOT end with a slash.
       * @param {Object} options.config MCC Configuration object.
       * @param {Cloud} options.cloud Current authentication information. This
       *  instance MAY be updated if a token refresh is required during the load.
       * @param {Array<string>} [options.onlyNamespaces] If specified, only clusters from these
       *  namespaces will be loaded; otherwise, all clusters in all namespaces will
       *  be loaded.
       */
      load(options) {
        if (!pr.loading) {
          _loadData(options);
        }
      },

      /** Resets store state. Data will need to be reloaded. */
      reset() {
        if (!pr.loading) {
          pr.reset();
        }
      },
    },
  };
};

export const ClusterDataProvider = function (props) {
  // NOTE: since the state is passed directly (by reference) into the context
  //  returned by the provider, even the initial state should be a clone of the
  //  `store` so that we consistently return a `state` property (in the context)
  //  that is a shallow clone of the `store`
  const [state, setState] = useState(pr.clone());
  const value = useMemo(() => [state, setState], [state]);

  pr.setState = setState;

  return <ClustersContext.Provider value={value} {...props} />;
};
