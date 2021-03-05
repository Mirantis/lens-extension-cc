"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ClustersProvider = exports.useClusters = void 0;

var _find2 = _interopRequireDefault(require("lodash/find"));

var _filter2 = _interopRequireDefault(require("lodash/filter"));

var _cloneDeepWith2 = _interopRequireDefault(require("lodash/cloneDeepWith"));

var _react = require("react");

var _Namespace = require("./Namespace");

var _Cluster = require("./Cluster");

var _authUtil = require("../auth/authUtil");

var strings = _interopRequireWildcard(require("../../strings"));

var _ProviderStore = require("./ProviderStore");

var _package = _interopRequireDefault(require("../../../package.json"));

var _jsxRuntime = require("@emotion/react/jsx-runtime");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//
// Provider (Store) for Namespace and Cluster API data
//
//
// Store
//
class ClustersProviderStore extends _ProviderStore.ProviderStore {
  // @override
  makeNew() {
    return { ...super.makeNew(),
      data: {
        namespaces: [],
        // @type {Array<Namespace>}
        // All clusters except any that are in progress of being deleted; use
        //  `Cluster.namespace` to find groups
        // @type {Array<Cluster>}
        clusters: []
      }
    };
  } // @override


  clone() {
    return (0, _cloneDeepWith2.default)(this.store, (value, key) => {
      if (key === 'data') {
        // instead of letting Lodash dig deep into this object, shallow-clone it
        //  since we don't actively set any properties beneath it's immediate ones
        return { ...value
        };
      } // else, let Lodash do the cloning

    });
  }

}

const pr = new ClustersProviderStore(); //
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
      error: strings.clustersProvider.errors.invalidNamespacePayload()
    };
  }

  return {
    data: body.items.map((item, idx) => {
      try {
        return new _Namespace.Namespace(item);
      } catch (err) {
        // eslint-disable-next-line no-console -- OK to show errors
        console.error(`[${_package.default.name}/ClustersProvider._deserializeNamespacesList()] ERROR with namespace ${idx}: ${err.message}`, err);
        return undefined;
      }
    }).filter(cl => !!cl) // eliminate invalid namespaces (`undefined` items)

  };
};
/**
 * [ASYNC] Get all existing namespaces from the management cluster.
 * @param {string} cloudUrl MCC URL. Must NOT end with a slash.
 * @param {Object} config MCC Configuration object.
 * @param {AuthAccess} authAccess An AuthAccess object. Tokens will be updated/cleared
 *  if necessary.
 * @returns {Promise<Object>} On success `{ namespaces: Array<Namespace< }`;
 *  on error `{error: string}`.
 */


const _fetchNamespaces = async function (cloudUrl, config, authAccess) {
  const {
    error,
    body
  } = await (0, _authUtil.authedRequest)({
    baseUrl: cloudUrl,
    authAccess,
    config,
    method: 'list',
    entity: 'namespace'
  });

  if (error) {
    return {
      error
    };
  }

  const {
    data,
    error: dsError
  } = _deserializeNamespacesList(body);

  if (dsError) {
    return {
      error: dsError
    };
  }

  const userRoles = (0, _authUtil.extractJwtPayload)(authAccess.token).iam_roles || [];

  const hasReadPermissions = name => userRoles.includes(`m:kaas:${name}@reader`) || userRoles.includes(`m:kaas:${name}@writer`);

  const ignoredNamespaces = config.ignoredNamespaces || [];
  const namespaces = (0, _filter2.default)(data, ns => !ignoredNamespaces.includes(ns.name) && hasReadPermissions(ns.name));
  return {
    namespaces
  };
};
/**
 * Deserialize the raw list of cluster data from the API into Cluster objects.
 * @param {Object} body Data response from /list/cluster API.
 * @returns {Array<Cluster>} Array of Cluster objects.
 */


const _deserializeClustersList = function (body) {
  if (!body || !Array.isArray(body.items)) {
    return {
      error: strings.clusterProvider.error.invalidClusterPayload()
    };
  }

  return {
    data: body.items.map((item, idx) => {
      try {
        return new _Cluster.Cluster(item);
      } catch (err) {
        // eslint-disable-next-line no-console -- OK to show errors
        console.error(`[${_package.default.name}/ClustersProvider._deserializeClustersList()] ERROR with cluster ${idx} (namespace/name="${item?.metadata?.namespace ?? '<unknown>'}/${item?.metadata?.name ?? '<unknown>'}"): ${err.message}`, err);
        return undefined;
      }
    }).filter(cl => !!cl) // eliminate invalid clusters (`undefined` items)

  };
};
/**
 * [ASYNC] Get all existing clusters from the management cluster, for each namespace
 *  specified.
 * @param {string} cloudUrl MCC URL. Must NOT end with a slash.
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


const _fetchClusters = async function (cloudUrl, config, authAccess, namespaces) {
  const results = await Promise.all(namespaces.map(namespaceName => (0, _authUtil.authedRequest)({
    baseUrl: cloudUrl,
    authAccess,
    config,
    method: 'list',
    entity: 'cluster',
    args: {
      namespaceName
    } // extra args

  })));
  const errResult = (0, _find2.default)(results, r => !!r.error);

  if (errResult) {
    return {
      error: errResult.error
    };
  }

  let clusters = [];
  let dsError;
  results.every(result => {
    const {
      data,
      error
    } = _deserializeClustersList(result.body);

    if (error) {
      dsError = {
        error
      };
      return false; // break
    }

    clusters = [...clusters, ...data];
    return true; // next
  });
  return dsError || {
    clusters
  };
};
/**
 * [ASYNC] Loads namespaces and clusters from the API.
 * @param {string} cloudUrl MCC URL. Must NOT end with a slash.
 * @param {Object} config MCC Configuration object.
 * @param {AuthAccess} authAccess Current authentication information. This
 *  instance MAY be updated if a token refresh is required during the load.
 */


const _loadData = async function (cloudUrl, config, authAccess) {
  pr.reset(true);
  const nsResults = await _fetchNamespaces(cloudUrl, config, authAccess);

  if (nsResults.error) {
    pr.loading = false;
    pr.loaded = true;
    pr.store.error = nsResults.error;
  } else {
    pr.store.data.namespaces = nsResults.namespaces;
    const namespaces = pr.store.data.namespaces.map(ns => ns.name);
    const clResults = await _fetchClusters(cloudUrl, config, authAccess, namespaces);
    pr.loading = false;
    pr.loaded = true;

    if (clResults.error) {
      pr.store.error = clResults.error;
    } else {
      pr.store.data.clusters = clResults.clusters.filter(cluster => !cluster.deleteInProgress);
    }
  }

  pr.notifyIfError();
  pr.onChange();
}; //
// Provider Definition
//


const ClustersContext = /*#__PURE__*/(0, _react.createContext)();

const useClusters = function () {
  const context = (0, _react.useContext)(ClustersContext);

  if (!context) {
    throw new Error('useClusters must be used within an ClustersProvider');
  } // NOTE: `context` is the value of the `value` prop we set on the
  //  <ClustersContext.Provider value={...}/> we return as the <ClustersProvider/>
  //  component to wrap all children that should have access to the state (i.e.
  //  all the children that will be able to `useClusters()` to access the state)


  const [state] = context; // this is what you actually get from `useClusters()` when you consume it

  return {
    state,
    //// ACTIONS
    actions: {
      /**
       * [ASYNC] Loads namespaces and clusters.
       * @param {string} cloudUrl MCC URL. Must NOT end with a slash.
       * @param {Object} config MCC Configuration object.
       * @param {AuthAccess} authAccess Current authentication information. This
       *  instance MAY be updated if a token refresh is required during the load.
       */
      load(cloudUrl, config, authAccess) {
        if (!pr.loading) {
          _loadData(cloudUrl, config, authAccess);
        }
      },

      /** Resets store state. Data will need to be reloaded. */
      reset() {
        if (!pr.loading) {
          pr.reset();
        }
      }

    }
  };
};

exports.useClusters = useClusters;

const ClustersProvider = function (props) {
  // NOTE: since the state is passed directly (by reference) into the context
  //  returned by the provider, even the initial state should be a clone of the
  //  `store` so that we consistently return a `state` property (in the context)
  //  that is a shallow clone of the `store`
  const [state, setState] = (0, _react.useState)(pr.clone());
  const value = (0, _react.useMemo)(() => [state, setState], [state]);
  pr.setState = setState;
  return (0, _jsxRuntime.jsx)(ClustersContext.Provider, {
    value: value,
    ...props
  });
};

exports.ClustersProvider = ClustersProvider;