"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ClusterActionsProvider = exports.useClusterActions = void 0;

var _react = require("react");

var _propTypes = _interopRequireDefault(require("prop-types"));

var rtv = _interopRequireWildcard(require("rtvjs"));

var _fs = require("fs");

var _path = _interopRequireDefault(require("path"));

var _AuthClient = require("../auth/clients/AuthClient");

var _extensions = require("@k8slens/extensions");

var _templates = require("../templates");

var _AuthAccess = require("../auth/AuthAccess");

var strings = _interopRequireWildcard(require("../../strings"));

var _constants = require("../../constants");

var _ProviderStore = require("./ProviderStore");

var _Cluster = require("./Cluster");

var _package = _interopRequireDefault(require("../../../package.json"));

var _jsxRuntime = require("@emotion/react/jsx-runtime");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//
// Provider for adding clusters to Lens
//
const {
  workspaceStore
} = _extensions.Store;
const {
  Notifications
} = _extensions.Component;
let extension; // {LensRendererExtension} instance reference
//
// Store
//

class AddClustersProviderStore extends _ProviderStore.ProviderStore {
  // @override
  makeNew() {
    return { ...super.makeNew(),
      newWorkspaces: [],
      // {Array<Workspace>} list of new workspaces created, if any; shape: https://github.com/lensapp/lens/blob/00be4aa184089c1a6c7247bdbfd408665f325665/src/common/workspace-pr.store.ts#L27
      kubeClusterAdded: false // true if the cluster added via single kubeConfig was added; false if it was skipped because it was already in Lens

    };
  }

}

const pr = new AddClustersProviderStore(); //
// Internal Methods
//

/**
 * Determines if a cluster is already in Lens and returns its Lens Cluster object.
 * @param {string|Cluster} cluster Cluster ID, or cluster object, to check.
 * @returns {LensCluster|undefined} Lens Cluster if the cluster is already in Lens;
 *  `undefined` otherwise.
 */

const _getLensCluster = function (cluster) {
  const existingLensClusters = _extensions.Store.clusterStore.clustersList;
  const clusterId = cluster instanceof _Cluster.Cluster ? cluster.id : cluster;
  return existingLensClusters.find(lensCluster => lensCluster.id === clusterId);
};
/**
 * Filters clusters into separate lists.
 * @param {Array<Cluster>} clusters
 * @returns {{ newClusters: Array<Cluster>, existingClusters: Array<Cluster>}}
 *  `newClusters` are those which do not exist in Lens; `existingClusters` are
 *  those that do.
 */


const _filterClusters = function (clusters) {
  const existingClusters = []; // {Array<Cluster>} clusters already existing in Lens
  // filter the clusters down to only clusters that aren't already in Lens

  const newClusters = clusters.filter(cluster => {
    if (_getLensCluster(cluster)) {
      existingClusters.push(cluster);
      return false; // skip it
    }

    return true; // add it
  });
  return {
    newClusters,
    existingClusters
  };
};
/**
 * [ASYNC] Gets access tokens for the specified cluster.
 * @param {Cluster} options.cluster
 * @param {string} options.cloudUrl MCC URL. Must NOT end with a slash.
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
  cloudUrl,
  config,
  username,
  password,
  offline = false
}) {
  const authClient = new _AuthClient.AuthClient(cloudUrl, config);
  const {
    error,
    body
  } = await authClient.getToken(username, password, offline, cluster.idpClientId);

  if (error) {
    return {
      error
    };
  }

  return {
    authAccess: new _AuthAccess.AuthAccess({ ...body,
      username,
      password,
      idpClientId: cluster.idpClientId
    })
  };
};
/**
 * [ASYNC] Generates a kubeConfig for the given cluster.
 * @param {Cluster} options.cluster
 * @param {string} options.cloudUrl MCC URL. Must NOT end with a slash.
 * @param {Object} options.config MCC Config object.
 * @param {AuthAccess} options.username
 * @param {string} options.password
 * @param {boolean} [options.offline] If true, the refresh token generated for the
 *  clusters will be enabled for offline access. WARNING: This is less secure
 *  than a normal refresh token as it will never expire.
 * @returns {Promise<Object>} On success, `{cluster: Cluster, kubeConfig: Object}`,
 *  the provided `cluster`, and its kubeConfig JSON object to save to disk and add
 *  to Lens; on error, `{error: string}`.
 */


const _createKubeConfig = async function ({
  cluster,
  cloudUrl,
  config,
  username,
  password,
  offline = false
}) {
  const errPrefix = strings.clusterActionsProvider.errors.kubeConfigCreate(cluster.id);
  const {
    error: accessError,
    authAccess
  } = await _getClusterAccess({
    cluster,
    cloudUrl,
    config,
    username,
    password,
    offline
  });

  if (accessError) {
    return {
      error: `${errPrefix}: ${accessError}`
    };
  }

  return {
    cluster,
    kubeConfig: (0, _templates.kubeConfigTemplate)({
      username: authAccess.username,
      token: authAccess.token,
      refreshToken: authAccess.refreshToken,
      cluster
    })
  };
};
/**
 * [ASYNC] Writes a kubeConfig to the local disk for the given cluster.
 * @param {string} options.namespace MCC namespace the cluster comes from.
 * @param {string} options.clusterName Name of the cluster in MCC.
 * @param {string} options.clusterId ID of the cluster in MCC.
 * @param {Object} options.kubeConfig Kubeconfig JSON object for the cluster.
 * @param {string} options.savePath Absolute path where kubeConfigs are to be saved.
 * @returns {Promise<Object>} On success, `{model: ClusterModel}`, a cluster model
 *  to use to add the cluster to Lens; on error, `{error: string}`. All clusters
 *  are configured to be added to the active workspace by default.
 */


const _writeKubeConfig = async function ({
  namespace,
  clusterName,
  clusterId,
  kubeConfig,
  savePath
}) {
  const errPrefix = strings.clusterActionsProvider.errors.kubeConfigSave(clusterId);

  const kubeConfigPath = _path.default.resolve(savePath, `${namespace}-${clusterName}-${clusterId}.json`);

  try {
    // overwrite if already exists for some reason (failed to delete last time?)
    await _fs.promises.writeFile(kubeConfigPath, JSON.stringify(kubeConfig, undefined, 2));
  } catch (err) {
    return {
      error: `${errPrefix}: ${err.message}`
    };
  } // id - unique id (up to extension to decide what it is)
  // contextName - used contextName in given kubeConfig
  // workspace: workspace id, all clusters need to belong to a workspace (there is “default” workspace always available)


  return {
    model: {
      kubeConfigPath,
      id: clusterId,
      // can be anything provided it's unique
      contextName: kubeConfig.contexts[0].name,
      // must be same context name used in the kubeConfig file
      workspace: workspaceStore.currentWorkspaceId // ownerRef: unique ref/id (up to extension to decide what it is), if unset
      //  then Lens allows the user to remove the cluster; otherwise, only the
      //  extension itself can remove it

    }
  };
};
/**
 * Assigns a cluster model to an existing or new workspace that correlates to its
 *  original MCC namespace. New workspaces are created if necessary and added
 *  to this Provider's `pr.store.newWorkspaces` list.
 * @param {ClusterModel} model Model for the cluster being added. This model is
 *  modified in-place. NOTE: `model.id` is expected to be the ID of the cluster.
 * @param {string} namespace MCC namespace of the cluster the model represents.
 */


const _assignWorkspace = function (model, namespace) {
  const findWorkspace = id => workspaceStore.workspacesList.find(ws => ws.id === id);

  const wsId = `${_constants.workspacePrefix}${namespace}`;
  const workspace = findWorkspace(wsId);
  model.workspace = wsId; // re-assign cluster to custom workspace

  if (!workspace) {
    // create new workspace
    // @see https://github.com/lensapp/lens/blob/00be4aa184089c1a6c7247bdbfd408665f325665/src/common/workspace-pr.store.ts#L27
    const ws = new _extensions.Store.Workspace({
      id: wsId,
      name: wsId,
      description: strings.clusterActionsProvider.workspaces.description()
    });
    workspaceStore.addWorkspace(ws);
    pr.store.newWorkspaces.push(ws);
  }
};
/**
 * Assigns each cluster to an existing or new workspace that correlates to its
 *  original MCC namespace. New workspaces are created if necessary and added
 *  to this Provider's `pr.store.newWorkspaces` list.
 * @param {Array<Cluster>} clusters Clusters being added. Can be greater than
 *  `models`, but must at least contain a cluster for each model.
 * @param {Array<ClusterModel>} models Cluster models to add to Lens, one for
 *  each item in `clusters`. These are modified in-place. NOTE: `model.id` is
 *  expected to be the ID of the related cluster.
 */


const _assignClustersToWorkspaces = function (clusters, models) {
  const findCluster = id => clusters.find(cluster => cluster.id === id);

  models.forEach(model => {
    const cluster = findCluster(model.id);

    _assignWorkspace(model, cluster.namespace);
  });
};
/**
 * Posts a notification about new clusters added to Lens.
 * @param {Array<{namespace: string, id: string, name: string}>} clusterShims List
 *  objects with basic cluster info about which clusters were added.
 * @param {boolean} [sticky] True if the notification should be sticky; false
 *  if it should be quickly dismissed.
 */


const _notifyNewClusters = function (clusterShims, sticky = true) {
  Notifications[sticky ? 'info' : 'ok']((0, _jsxRuntime.jsx)("p", {
    dangerouslySetInnerHTML: {
      __html: strings.clusterActionsProvider.notifications.newClustersHtml(clusterShims.map(c => `${c.namespace}/${c.name}`))
    }
  }));
};
/**
 * Posts a notification about new workspaces created, and switches to the first
 *  new workspace in `pr.store.newWorkspaces` in Lens.
 * @throws {Error} If `pr.store.newWorkspaces` is empty.
 */


const _switchToNewWorkspace = function () {
  if (pr.store.newWorkspaces.length <= 0) {
    throw new Error(`[${_package.default.name}/AddClustersProvider._notifyAndSwitchToNew] There must be at least one new workspace to switch to!`);
  } // notify all new workspace names


  Notifications.info((0, _jsxRuntime.jsx)("p", {
    dangerouslySetInnerHTML: {
      __html: strings.clusterActionsProvider.notifications.newWorkspacesHtml(pr.store.newWorkspaces.map(ws => ws.name))
    }
  })); // activate the first new workspace, preferring NOT to activate the workspace
  //  related to the 'default' namespace, which typically contains only the
  //  MCC management cluster and isn't usually of any interest

  const filteredWorkspaces = pr.store.newWorkspaces.length > 1 ? pr.store.newWorkspaces.filter(ws => ws.name !== `${_constants.workspacePrefix}default`) : pr.store.newWorkspaces;

  if (filteredWorkspaces.length > 0) {
    const firstWorkspace = filteredWorkspaces[0];

    _extensions.Store.workspaceStore.setActive(firstWorkspace.id);

    Notifications.info((0, _jsxRuntime.jsx)("p", {
      dangerouslySetInnerHTML: {
        __html: strings.clusterActionsProvider.notifications.workspaceActivatedHtml(firstWorkspace.name)
      }
    }));
  }
};
/**
 * Switch to the specified cluster.
 * @param {string} clusterId ID of the cluster in Lens.
 */


const _switchToCluster = function (clusterId) {
  _extensions.Store.clusterStore.activeClusterId = clusterId; // TODO: doesn't __always__ work; bug in Lens somewhere, and feels like clusterStore
  //  should have setActive(clusterId) like workspaceStore.setActive() and have it do
  //  the navigation in a consistent way.
  // TRACKING: https://github.com/Mirantis/lens-extension-cc/issues/26

  extension.navigate(`/cluster/${clusterId}`);
};
/**
 * Adds one or more clusters to Lens.
 * @param {string} cloudUrl MCC instance base URL that owns all the clusters.
 * @param {Array<{namespace: string, id: string, name: string}>} clusterShims
 *  Clusters being added.
 * @param {Array<ClusterModel>} models List of models for clusters to add, one for each
 *  item in `clusters`.
 */


const _storeClustersInLens = function (cloudUrl, clusterShims, models) {
  rtv.verify({
    _addClustersToLens: {
      cloudUrl,
      clusterShims,
      models
    }
  }, {
    _addClustersToLens: {
      cloudUrl: rtv.STRING,
      clusterShims: [[{
        namespace: rtv.STRING,
        name: rtv.STRING,
        id: rtv.STRING
      }]],
      models: [[rtv.PLAIN_OBJECT], (value, match, typeset, {
        parent
      }) => parent.clusterShims.length === value.length]
    }
  });
  clusterShims.forEach((shim, idx) => {
    // officially add to Lens
    const lensCluster = _extensions.Store.clusterStore.addCluster(models[idx]); // store custom metadata in the cluster object, which Lens will persist


    lensCluster.metadata[_package.default.name] = {
      cloudUrl,
      namespace: shim.namespace,
      clusterId: shim.clusterId,
      clusterName: shim.clusterName
    };
  });
};
/**
 * [ASYNC] Add the specified clusters to Lens.
 * @param {Object} options
 * @param {Array<Cluster>} options.clusters Clusters to add.
 * @param {string} options.savePath Absolute path where kubeConfigs are to be saved.
 * @param {string} options.cloudUrl MCC URL. Must NOT end with a slash.
 * @param {Object} options.config MCC Config object.
 * @param {AuthAccess} options.username Used to generate access tokens for MCC clusters.
 * @param {string} options.password User password.
 * @param {boolean} [options.offline] If true, the refresh token generated for the
 *  clusters will be enabled for offline access. WARNING: This is less secure
 *  than a normal refresh token as it will never expire.
 * @param {boolean} [options.addToNew] If true, the clusters will be added
 *  to new (or existing if the workspaces already exist) workspaces that
 *  correlate to their original MCC namespaces; otherwise, they will all
 *  be added to the active workspace.
 */


const _addClusters = async function ({
  clusters,
  savePath,
  cloudUrl,
  config,
  username,
  password,
  offline = false,
  addToNew = false
}) {
  pr.reset(true);

  const {
    newClusters,
    existingClusters
  } = _filterClusters(clusters); // start by creating the kubeConfigs for each cluster


  let promises = newClusters.map(cluster => _createKubeConfig({
    cluster,
    savePath,
    cloudUrl,
    config,
    username,
    password,
    offline
  })); // these promises are designed NOT to reject

  let results = await Promise.all(promises); // {Array<{cluster: Cluster, kubeConfig: Object}>} on success

  let failure = results.find(res => !!res.error); // look for any errors, use first-found

  if (!failure) {
    // write each kubeConfig to disk
    promises = results.map(({
      cluster,
      kubeConfig
    }) => _writeKubeConfig({
      namespace: cluster.namespace,
      clusterName: cluster.name,
      clusterId: cluster.id,
      kubeConfig,
      savePath
    })); // these promises are designed NOT to reject

    results = await Promise.all(promises); // {Array<{model: ClusterModel}>} on success

    failure = results.find(res => !!res.error); // look for any errors, use first-found
  }

  pr.loading = false;
  pr.loaded = true;

  if (failure) {
    pr.store.error = failure.error;
  } else {
    const models = results.map(({
      model
    }) => model);

    if (addToNew) {
      _assignClustersToWorkspaces(newClusters, models);
    }

    _storeClustersInLens(cloudUrl, newClusters, models);

    if (newClusters.length > 0) {
      _notifyNewClusters(newClusters);
    }

    if (addToNew && pr.store.newWorkspaces.length > 0) {
      _switchToNewWorkspace();
    }

    if (existingClusters.length > 0) {
      Notifications.info((0, _jsxRuntime.jsx)("p", {
        dangerouslySetInnerHTML: {
          __html: strings.clusterActionsProvider.notifications.skippedClusters(existingClusters.map(cluster => `${cluster.namespace}/${cluster.name}`))
        }
      }));
    }
  }

  pr.notifyIfError();
  pr.onChange();
};
/**
 * [ASYNC] Add the specified cluster via kubeConfig to Lens.
 * @param {Object} options
 * @param {string} options.savePath Absolute path where kubeConfigs are to be saved.
 * @param {string} options.cloudUrl MCC URL. Must NOT end with a slash.
 * @param {Object} options.kubeConfig KubeConfig object for the cluster to add.
 * @param {string} options.namespace MCC namespace to which the cluster belongs.
 * @param {string} options.clusterName Name of the cluster.
 * @param {string} options.clusterId ID of the cluster.
 * @param {boolean} [options.addToNew] If true, the clusters will be added
 *  to new (or existing if the workspaces already exist) workspaces that
 *  correlate to their original MCC namespaces; otherwise, they will all
 *  be added to the active workspace.
 */


const _addKubeCluster = async function ({
  savePath,
  cloudUrl,
  kubeConfig,
  namespace,
  clusterName,
  clusterId,
  addToNew = false
}) {
  pr.reset(true);

  if (_getLensCluster(clusterId)) {
    // when adding just one cluster via kubeConfig, use the non-sticky OK
    //  notification since we'll also display a static message in the UI
    Notifications.ok((0, _jsxRuntime.jsx)("p", {
      dangerouslySetInnerHTML: {
        __html: strings.clusterActionsProvider.notifications.skippedClusters([`${namespace}/${clusterName}`])
      }
    }));
  } else {
    const {
      model,
      error
    } = await _writeKubeConfig({
      namespace,
      clusterName,
      clusterId,
      kubeConfig,
      savePath
    });

    if (error) {
      pr.store.error = error;
    } else {
      if (addToNew) {
        _assignWorkspace(model, namespace);
      }

      _storeClustersInLens(cloudUrl, [{
        namespace,
        id: clusterId,
        name: clusterName
      }], [model]);

      pr.store.kubeClusterAdded = true; // don't use a sticky notification for the cluster since the UI will display
      //  a related message about the new cluster.

      _notifyNewClusters([{
        namespace,
        id: clusterId,
        name: clusterName
      }], false);

      if (addToNew && pr.store.newWorkspaces.length > 0) {
        _switchToNewWorkspace();
      }

      _switchToCluster(clusterId);
    }
  }

  pr.loading = false;
  pr.loaded = true;
  pr.notifyIfError();
  pr.onChange();
};
/**
 * [ASYNC] Activate the specified cluster in Lens if it already exists.
 * @param {Object} options
 * @param {string} options.namespace MCC namespace to which the cluster belongs.
 * @param {string} options.clusterName Name of the cluster.
 * @param {string} options.clusterId ID of the cluster.
 */


const _activateCluster = function ({
  namespace,
  clusterName,
  clusterId
}) {
  pr.reset(true);

  const lensCluster = _getLensCluster(clusterId);

  if (lensCluster) {
    _extensions.Store.workspaceStore.setActive(lensCluster.workspace);

    _switchToCluster(clusterId);
  } else {
    pr.store.error = strings.clusterActionsProvider.errors.clusterNotFound(`${namespace}/${clusterName}`);
  }

  pr.loading = false;
  pr.loaded = true;
  pr.notifyIfError();
  pr.onChange();
}; //
// Provider Definition
//


const ClusterActionsContext = /*#__PURE__*/(0, _react.createContext)();

const useClusterActions = function () {
  const context = (0, _react.useContext)(ClusterActionsContext);

  if (!context) {
    throw new Error('useAddClusters must be used within an AddClustersProvider');
  } // NOTE: `context` is the value of the `value` prop we set on the
  //  <AddClustersContext.Provider value={...}/> we return as the <AddClustersProvider/>
  //  component to wrap all children that should have access to the state (i.e.
  //  all the children that will be able to `useAddClusters()` to access the state)


  const [state] = context; // this is what you actually get from `useAddClusters()` when you consume it

  return {
    state,
    //// ACTIONS
    actions: {
      /**
       * [ASYNC] Add the specified clusters to Lens.
       * @param {Object} options
       * @param {Array<Cluster>} options.clusters Clusters to add.
       * @param {string} options.savePath Absolute path where kubeConfigs are to be saved.
       * @param {string} options.cloudUrl MCC URL. Must NOT end with a slash.
       * @param {Object} options.config MCC Config object.
       * @param {string} options.username Used to generate access tokens for MCC clusters.
       * @param {string} options.password User password.
       * @param {boolean} [options.offline] If true, the refresh token generated for the
       *  clusters will be enabled for offline access. WARNING: This is less secure
       *  than a normal refresh token as it will never expire.
       * @param {boolean} [options.addToNew] If true, the clusters will be added
       *  to new (or existing if the workspaces already exist) workspaces that
       *  correlate to their original MCC namespaces; otherwise, they will all
       *  be added to the active workspace.
       */
      addClusters(options) {
        if (!pr.loading && options.clusters.length > 0) {
          _addClusters(options);
        }
      },

      /**
       * [ASYNC] Add the specified cluster via kubeConfig to Lens.
       * @param {Object} options
       * @param {string} options.savePath Absolute path where kubeConfigs are to be saved.
       * @param {string} options.cloudUrl MCC URL. Must NOT end with a slash.
       * @param {Object} options.kubeConfig Kubeconfig object for the cluster to add.
       * @param {string} options.namespace MCC namespace to which the cluster belongs.
       * @param {string} options.clusterName Name of the cluster.
       * @param {string} options.clusterId ID of the cluster.
       * @param {boolean} [options.addToNew] If true, the clusters will be added
       *  to new (or existing if the workspaces already exist) workspaces that
       *  correlate to their original MCC namespaces; otherwise, they will all
       *  be added to the active workspace.
       */
      addKubeCluster(options) {
        if (!pr.loading) {
          _addKubeCluster(options);
        }
      },

      /**
       * [ASYNC] Activate the specified cluster in Lens if it already exists.
       * @param {Object} options
       * @param {string} options.namespace MCC namespace to which the cluster belongs.
       * @param {string} options.clusterName Name of the cluster.
       * @param {string} options.clusterId ID of the cluster.
       */
      activateCluster(options) {
        if (!pr.loading) {
          _activateCluster(options);
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

exports.useClusterActions = useClusterActions;

const ClusterActionsProvider = function ({
  extension: lensExtension,
  ...props
}) {
  extension = lensExtension; // NOTE: since the state is passed directly (by reference) into the context
  //  returned by the provider, even the initial state should be a clone of the
  //  `store` so that we consistently return a `state` property (in the context)
  //  that is a shallow clone of the `store`

  const [state, setState] = (0, _react.useState)(pr.clone());
  const value = (0, _react.useMemo)(() => [state, setState], [state]);
  pr.setState = setState;
  return (0, _jsxRuntime.jsx)(ClusterActionsContext.Provider, {
    value: value,
    ...props
  });
};

exports.ClusterActionsProvider = ClusterActionsProvider;
ClusterActionsProvider.propTypes = {
  extension: _propTypes.default.object.isRequired
};