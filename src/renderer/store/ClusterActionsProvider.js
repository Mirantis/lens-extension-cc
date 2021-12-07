//
// Provider for adding clusters to Lens
//

import { createContext, useContext, useState, useMemo } from 'react';
import * as rtv from 'rtvjs';
import { promises as fs } from 'fs';
import path from 'path';
import { Common, Renderer } from '@k8slens/extensions';
import { AuthClient } from '../auth/clients/AuthClient';
import { kubeConfigTemplate } from '../../util/templates';
import { Cloud } from '../auth/Cloud';
import { ProviderStore } from './ProviderStore';
import { Cluster } from './Cluster';
import { logger } from '../../util/logger';
import { clusterModelTs } from '../../typesets';
import { extractJwtPayload } from '../auth/authUtil';
import { IpcRenderer } from '../IpcRenderer';
import { getLensClusters } from '../rendererUtil';
import * as strings from '../../strings';
import * as consts from '../../constants';

const { Util } = Common;
const {
  Component: { Notifications },
} = Renderer;

// OAuth2 'state' parameter value to use when requesting tokens for one cluster out of many
export const SSO_STATE_ADD_CLUSTERS = 'add-clusters';

//
// Store
//

class ClusterActionsProviderStore extends ProviderStore {
  // @override
  makeNew() {
    return {
      ...super.makeNew(),
      newWorkspaces: [], // {Array<Workspace>} list of new workspaces created, if any; shape: https://github.com/lensapp/lens/blob/00be4aa184089c1a6c7247bdbfd408665f325665/src/common/workspace-pr.store.ts#L27
      kubeClusterAdded: false, // true if the cluster added via single kubeConfig was added; false if it was skipped because it was already in Lens
      ssoAddClustersInProgress: false, // true (along with `loading`) if an 'add clusters' operation is in progress
    };
  }
}

const pr = new ClusterActionsProviderStore();

//
// Internal Methods
//

/**
 * Posts an info-style notification that auto-dismissed after X seconds unless the
 *  user interacts with it or mouses over it.
 * @param {Component} Message Message to post.
 * @param {Object} [options] Additional notification options. See
 *  https://docs.k8slens.dev/v4.2.4/extensions/api/interfaces/_renderer_api_components_.notification/
 *  for options (all except for `message`). The actual code is probably more helpful than
 *  those API docs...
 *  https://github.com/lensapp/lens/blob/70a8982c9f6396107f92aeced465620761d90726/src/renderer/components/notifications/notifications.tsx#L32
 */
const _postInfo = function (Message, options) {
  Notifications.info(Message, {
    // default is 0 (which means user must manually dismiss), and Notifications.ok()
    //  is similar to info() but dismissed in 2500ms which feels a bit short
    timeout: 3500,

    ...options,
  });
};

/**
 * Determines if a cluster is already in Lens and returns its Lens Cluster object.
 * @param {string|Cluster} cluster Cluster ID, or cluster object, to check.
 * @returns {LensCluster|undefined} Lens Cluster if the cluster is already in Lens;
 *  `undefined` otherwise.
 */
const _getLensCluster = function (cluster) {
  const existingLensClusters = getLensClusters();
  const clusterId = cluster instanceof Cluster ? cluster.id : cluster;

  return existingLensClusters.find(
    (lensCluster) => lensCluster.metadata.uid === clusterId
  );
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
  const newClusters = clusters.filter((cluster) => {
    if (_getLensCluster(cluster)) {
      existingClusters.push(cluster);
      return false; // skip it
    }

    return true; // add it
  });

  return {
    newClusters,
    existingClusters,
  };
};

/**
 * [ASYNC] Gets access tokens for the specified cluster using SSO AUTH.
 * @param {Object} options
 * @param {Cluster} options.cluster The cluster to access.
 * @param {Object} options.oAuth The OAuth response request parameters as JSON.
 *  `code` is the authorization code needed to obtain access tokens for the cluster.
 * @param {Object} options.config MCC Config object.
 * @param {boolean} [options.offline] If true, the refresh token generated for the
 *  clusters will be enabled for offline access. WARNING: This is less secure
 *  than a normal refresh token as it will never expire.
 * @returns {Promise<Object>} On success, `{cloud: Cloud}`, a new Cloud
 *  object that contains the token information; on error, `{error: string}`.
 * @throws {Error} If `config` is not using SSO.
 */
const _getClusterAccess = async function ({
  cluster,
  oAuth,
  config,
  offline = false,
}) {
  if (!config.keycloakLogin) {
    throw new Error('_getClusterAccess() does not support basic auth');
  }

  const authClient = new AuthClient({ config });
  let body;
  let error;

  if (oAuth.code) {
    ({ body, error } = await authClient.getToken({
      authCode: oAuth.code,
      clientId: cluster.idpClientId, // tokens unique to the cluster
      offline,
    }));
  } else {
    // no code, something went wrong
    error = oAuth.error || oAuth.error_description || 'unknown';
  }

  let cloud;
  if (error) {
    logger.error(
      'ClusterActionsProvider._ssoGetClusterAccess()',
      `Failed to get tokens from authorization code, error="${error}"`
    );
    error = strings.clusterActionsProvider.error.sso.authCode(cluster.id);
  } else {
    const jwt = extractJwtPayload(body.id_token);
    if (jwt.preferred_username) {
      cloud = new Cloud({
        username: jwt.preferred_username,
        ...body,
      });
    } else {
      logger.error(
        'ClusterActionsProvider._ssoGetClusterAccess()',
        'Failed to get username from token JWT'
      );
      error = strings.clusterActionsProvider.error.sso.authCode(cluster.id);
    }
  }

  return { cloud, error };
};

/**
 * [ASYNC] Writes a kubeConfig to the local disk for the given cluster.
 * @param {string} options.cloudUrl MCC instance base URL that owns the cluster.
 * @param {string} options.namespace MCC namespace the cluster comes from.
 * @param {string} options.clusterName Name of the cluster in MCC.
 * @param {string} options.clusterId ID of the cluster in MCC.
 * @param {Object} options.kubeConfig Kubeconfig JSON object for the cluster.
 * @param {string} options.savePath Absolute path where kubeConfigs are to be saved.
 * @returns {Promise<Object>} On success, `{model: ClusterModel}`, a cluster model
 *  to use to add the cluster to Lens (see `clusterModelTs` typeset for interface.);
 *  on error, `{error: string}`. All clusters are configured to be added to the active
 *  workspace by default.
 */
const _writeKubeConfig = async function ({
  cloudUrl,
  namespace,
  clusterName,
  clusterId,
  kubeConfig,
  savePath,
}) {
  const errPrefix =
    strings.clusterActionsProvider.error.kubeConfigSave(clusterId);

  const kubeconfigPath = path.resolve(
    savePath,
    `${namespace}-${clusterName}-${clusterId}.json`
  );

  try {
    // overwrite if already exists for some reason (failed to delete last time?)
    await fs.writeFile(
      kubeconfigPath,
      JSON.stringify(kubeConfig, undefined, 2)
    );
  } catch (err) {
    return { error: `${errPrefix}: ${err.message}` };
  }

  return {
    model: {
      // NOTE: This is a partial KubernetesCluster model to be used when adding
      //  a cluster to a Catalog source with `new Catalog.KubernetesCluster(model)`.
      // See the following references for a complete notion of what propties are supported:
      //  @see node_modules/@k8slens/extensions/dist/src/common/catalog-entities/kubernetes-cluster.d.ts
      //  @see node_modules/@k8slens/extensions/dist/src/common/catalog/catalog-entity.d.ts

      metadata: {
        // native metadata
        uid: clusterId,
        name: clusterName,

        // custom metadata
        namespace,
        cloudUrl,
      },
      spec: {
        kubeconfigPath,
        kubeconfigContext: kubeConfig.contexts[0].name, // must be same context name used in the kubeConfig file
      },
      status: {
        phase: 'disconnected',
      },
    },
  };
};

/**
 * Posts a notification about new clusters added to Lens.
 * @param {Array<{namespace: string, id: string, name: string}>} clusterShims List
 *  objects with basic cluster info about which clusters were added.
 * @param {boolean} [sticky] True if the notification should be sticky; false
 *  if it should be quickly dismissed.
 */
const _notifyNewClusters = function (clusterShims) {
  _postInfo(
    <p
      dangerouslySetInnerHTML={{
        __html: strings.clusterActionsProvider.notifications.newClustersHtml(
          clusterShims.map((c) => `${c.namespace}/${c.name}`)
        ),
      }}
    />
  );
};

/**
 * Switch to the specified cluster (and associated workspace).
 * @param {string} clusterId ID of the cluster in Lens.
 */
const _switchToCluster = function (clusterId) {
  // NOTE: we need a short delay to ensure the navigation actually takes place,
  //  since we have just navigated to this extension's global page, and we're
  //  about to navigate elsewhere; if we do it too quickly, we end-up with a
  //  race condition and this navigation doesn't take place (we remain on our
  //  global page instead of going to the cluster)
  setTimeout(() => Renderer.Navigation.navigate(`/cluster/${clusterId}`), 500);
};

/**
 * Switch to the Catalog view to show all the clusters.
 */
const _switchToCatalog = function () {
  // TODO: eventually, once Lens supports filtering the Catalog view via navigation,
  //  like `/catalog#filter=...`, it would be great to switch to the Catalog
  //  view and somehow filter the list to only the clusters that were just added,
  //  or at least only MCC clusters with `mcc=true` label...

  // NOTE: adding a little delay seems to just help navigation work better
  setTimeout(() => Renderer.Navigation.navigate('/catalog'), 500);
};

/**
 * Adds metadata to cluster models to prepare them to be added to the Lens Catalog.
 * @param {Array<{namespace: string, id: string, name: string}>} clusterPartials
 *  Clusters being added. Subset of full `./Cluster.js` class properties.
 * @param {Array<ClusterModel>} models List of models for clusters to add, one for each
 *  item in `clusters`. See `clusterModelTs` typeset for interface.
 */
const _addMetadata = function (clusterPartials, models) {
  DEV_ENV &&
    rtv.verify(
      {
        clusterPartials,
        models,
      },
      {
        clusterPartials: [
          [{ namespace: rtv.STRING, name: rtv.STRING, id: rtv.STRING }],
        ],
        models: [
          [clusterModelTs],
          (value, match, typeset, { parent }) =>
            parent.clusterPartials.length === value.length,
        ],
      }
    );

  clusterPartials.forEach((partial, idx) => {
    const model = models[idx];

    // NOTE: @see `CatalogEntityMetadata` in
    //  `node_modules/@k8slens/extensions/dist/src/common/catalog/catalog-entity.d.ts`
    //  for required/supported/optional metadata properties; note that arbitrary
    //  metadata properties are also supported

    // Lens-specific optional metadata
    model.metadata.source = consts.catalog.source;
    model.metadata.labels = {
      [consts.catalog.labels.source]: 'true', // labels must be strings only
      [consts.catalog.labels.namespace]: partial.namespace,
    };
  });
};

/**
 * [ASYNC] Sends the specified cluster models to the Lens Catalog to be added.
 * @param {Array<ClusterModel>} models Models for the clusters to add to (send to)
 *  the Lens Catalog for display.
 * @returns {Promise.<Object>} Does not fail. Resolves to an empty object on success;
 *  resolves to an object with `error: string` property on failure.
 */
const _sendClustersToCatalog = async function (models) {
  try {
    await IpcRenderer.getInstance().invoke(
      consts.ipcEvents.invoke.ADD_CLUSTERS,
      models
    );
  } catch (err) {
    return { error: err.message };
  }

  return {};
};

/**
 * [ASYNC] Add the specified cluster kubeConfigs to Lens.
 * @param {Object} options
 * @param {string} options.cloudUrl MCC URL. Must NOT end with a slash.
 * @param {Array<Cluster>} options.newClusters New clusters to add that are not already in Lens.
 * @param {Array<Promise<{cluster: Cluster, kubeConfig: Object}>>} options.promises Promises that
 *  are designed NOT to fail, and which will yield objects containing `cluster` and
 *  associated `kubeConfig` for each cluster in `newClusters`.
 * @param {string} options.savePath Absolute path where kubeConfigs are to be saved.
 *  to new (or existing if the workspaces already exist) workspaces that
 *  correlate to their original MCC namespaces; otherwise, they will all
 *  be added to the active workspace.
 * @returns {Promise.<Object>} Does not fail. Resolves to an empty object on success;
 *  resolves to an object with `error: string` property on failure.
 */
const _addClusterKubeConfigs = async function ({
  cloudUrl,
  newClusters,
  promises,
  savePath,
}) {
  // these promises are designed NOT to reject
  let results = await Promise.all(promises); // {Array<{cluster: Cluster, kubeConfig: Object}>} on success
  let failure = results.find((res) => !!res.error); // look for any errors, use first-found

  if (!failure) {
    // write each kubeConfig to disk
    promises = results.map(({ cluster, kubeConfig }) =>
      _writeKubeConfig({
        cloudUrl,
        namespace: cluster.namespace,
        clusterName: cluster.name,
        clusterId: cluster.id,
        kubeConfig,
        savePath,
      })
    );

    // these promises are designed NOT to reject
    results = await Promise.all(promises); // {Array<{model: ClusterModel}>} on success
    failure = results.find((res) => !!res.error); // look for any errors, use first-found
  }

  if (failure) {
    return { error: failure.error };
  } else {
    const models = results.map(({ model }) => model);
    _addMetadata(newClusters, models);

    const sendResult = await _sendClustersToCatalog(models);
    if (sendResult.error) {
      logger.error(
        'ClusterActionProvider._addClusterKubeConfigs()',
        'Failed to add some clusters to Catalog, error="%s"',
        sendResult.error
      );
      return { error: strings.clusterActionsProvider.error.catalogAddFailed() };
    }

    if (newClusters.length > 0) {
      _notifyNewClusters(newClusters);
    }
  }

  return {};
};

/**
 * [ASYNC] Add the specified clusters to Lens.
 * @param {Object} options
 * @param {Array<Cluster>} options.clusters Clusters to add.
 * @param {Object} options.config MCC Config object.
 * @param {boolean} [options.offline] If true, the refresh token generated for the
 *  clusters will be enabled for offline access. WARNING: This is less secure
 *  than a normal refresh token as it will never expire.
 */
const _addClusters = async function ({ clusters, config, offline = false }) {
  pr.reset(true);

  const { newClusters, existingClusters } = _filterClusters(clusters);

  if (newClusters.length > 0) {
    pr.store.ssoAddClustersInProgress = true;

    const authClient = new AuthClient({ config });
    const url = authClient.getSsoAuthUrl({
      offline,
      clientId: newClusters[0].idpClientId, // tokens unique to the cluster
      state: SSO_STATE_ADD_CLUSTERS,
    });

    // NOTE: at this point, the event loop slice ends and we wait for the user to
    //  respond in the browser
    Util.openExternal(url); // open in default browser
  } else if (existingClusters.length > 0) {
    _postInfo(
      <p
        dangerouslySetInnerHTML={{
          __html: strings.clusterActionsProvider.notifications.skippedClusters(
            existingClusters.map(
              (cluster) => `${cluster.namespace}/${cluster.name}`
            )
          ),
        }}
      />
    );

    pr.loading = false;
    pr.loaded = true;
    pr.notifyIfError();
    pr.onChange();
  }
};

/**
 * [ASYNC] Finish the SSO process to add the specified cluster (ONE) to Lens.
 * @param {Object} options
 * @param {Object} options.oAuth The OAuth response request parameters as JSON.
 *  `code` is the authorization code needed to obtain access tokens for the cluster.
 * @param {Array<Cluster>} options.clusters Clusters to add. Must only be one, and it's
 *  assumed NOT to already be in Lens.
 * @param {string} options.savePath Absolute path where kubeConfigs are to be saved.
 * @param {string} options.cloudUrl MCC URL. Must NOT end with a slash.
 * @param {Object} options.config MCC Config object.
 * @param {boolean} [options.offline] If true, the refresh token generated for the
 *  clusters will be enabled for offline access. WARNING: This is less secure
 *  than a normal refresh token as it will never expire.
 * @throws {Error} If the store is not aware of a pending 'add clusters' operation.
 */
const _ssoFinishAddClusters = async function ({
  oAuth,
  clusters,
  savePath,
  cloudUrl,
  config,
  offline = false,
}) {
  if (!pr.store.ssoAddClustersInProgress) {
    throw new Error('A pending "add clusters" operation must be in progress');
  }

  if (clusters.length !== 1) {
    throw new Error('Expecting exactly one cluster to add');
  }

  const cluster = clusters[0];
  const { error: accessError, cloud } = await _getClusterAccess({
    cluster,
    oAuth,
    config,
    offline,
  });

  if (accessError) {
    pr.error = accessError;
  } else {
    const addResult = await _addClusterKubeConfigs({
      cloudUrl,
      newClusters: [cluster],
      existingClusters: [],
      promises: [
        Promise.resolve({
          cluster,
          kubeConfig: kubeConfigTemplate({
            username: cloud.username,
            token: cloud.token,
            refreshToken: cloud.refreshToken,
            cluster,
          }),
        }),
      ],
      savePath,
    });

    if (addResult.error) {
      pr.error = addResult.error;
    }
  }

  pr.store.ssoAddClustersInProgress = false;
  pr.loading = false;
  pr.loaded = true;
  pr.notifyIfError();
  pr.onChange();

  if (!pr.error) {
    _switchToCatalog();
  }
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
 */
const _addKubeCluster = async function ({
  savePath,
  cloudUrl,
  kubeConfig,
  namespace,
  clusterName,
  clusterId,
}) {
  pr.reset(true);

  if (_getLensCluster(clusterId)) {
    _postInfo(
      <p
        dangerouslySetInnerHTML={{
          __html: strings.clusterActionsProvider.notifications.skippedClusters([
            `${namespace}/${clusterName}`,
          ]),
        }}
      />
    );
  } else {
    const { model, error } = await _writeKubeConfig({
      cloudUrl,
      namespace,
      clusterName,
      clusterId,
      kubeConfig,
      savePath,
    });

    if (error) {
      pr.error = error;
    } else {
      const partial = { namespace, id: clusterId, name: clusterName };
      _addMetadata([partial], [model]);

      const sendResult = await _sendClustersToCatalog([model]);
      if (sendResult.error) {
        logger.error(
          'ClusterActionProvider._addKubeCluster()',
          'Failed to add cluster to Catalog, error="%s"',
          sendResult.error
        );
        pr.error = strings.clusterActionsProvider.error.catalogAddFailed();
      } else {
        pr.store.kubeClusterAdded = true;
        _notifyNewClusters([{ namespace, id: clusterId, name: clusterName }]);
        _switchToCluster(clusterId);
      }
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
const _activateCluster = function ({ namespace, clusterName, clusterId }) {
  pr.reset(true);

  const lensCluster = _getLensCluster(clusterId);

  if (lensCluster) {
    _switchToCluster(clusterId, lensCluster.workspace);
  } else {
    pr.error = strings.clusterActionsProvider.error.clusterNotFound(
      `${namespace}/${clusterName}`
    );
  }

  pr.loading = false;
  pr.loaded = true;

  pr.notifyIfError();
  pr.onChange();
};

//
// Provider Definition
//

const ClusterActionsContext = createContext();

export const useClusterActions = function () {
  const context = useContext(ClusterActionsContext);
  if (!context) {
    throw new Error(
      'useAddClusters must be used within an ClusterActionsProvider'
    );
  }

  // NOTE: `context` is the value of the `value` prop we set on the
  //  <AddClustersContext.Provider value={...}/> we return as the <ClusterActionsProvider/>
  //  component to wrap all children that should have access to the state (i.e.
  //  all the children that will be able to `useAddClusters()` to access the state)
  const [state] = context;

  // this is what you actually get from `useAddClusters()` when you consume it
  return {
    state,

    //// ACTIONS

    actions: {
      /**
       * [ASYNC] Add the specified clusters to Lens.
       *
       * This method will __start__ the SSO process to add the cluster (must only be one).
       *  `ssoFinishAddClusters()` must be called once the OAuth authorization code has been
       *  obtained in order to finish adding it.
       *
       * @param {Object} options
       * @param {Array<Cluster>} options.clusters Clusters to add.
       * @param {Object} options.config MCC Config object.
       * @param {boolean} [options.offline] If true, the refresh token generated for the
       *  clusters will be enabled for offline access. WARNING: This is less secure
       *  than a normal refresh token as it will never expire.
       * @throws {Error} If using SSO and `options.clusters` contains more than 1 cluster.
       */
      addClusters(options) {
        if (!pr.loading && options.clusters.length > 0) {
          if (options.clusters.length > 1) {
            throw new Error(
              'Cannot add more than one cluster at a time under SSO'
            );
          }

          _addClusters(options);
        }
      },

      /**
       * [ASYNC] Finish the SSO process to add the specified cluster (ONE) to Lens.
       * @param {Object} options
       * @param {Object} options.oAuth The OAuth response request parameters as JSON.
       *  `code` is the authorization code needed to obtain access tokens for the cluster.
       * @param {Array<Cluster>} options.clusters Clusters to add. Must only be one, and it's
       *  assumed NOT to already be in Lens.
       * @param {string} options.savePath Absolute path where kubeConfigs are to be saved.
       * @param {string} options.cloudUrl MCC URL. Must NOT end with a slash.
       * @param {Object} options.config MCC Config object.
       * @param {boolean} [options.offline] If true, the refresh token generated for the
       *  clusters will be enabled for offline access. WARNING: This is less secure
       *  than a normal refresh token as it will never expire.
       * @throws {Error} If `options.config` is not using SSO.
       * @throws {Error} If `options.clusters` contains more than 1 cluster.
       */
      ssoFinishAddClusters(options) {
        if (pr.store.ssoAddClustersInProgress) {
          if (!options.config.keycloakLogin) {
            throw new Error('Config is not using SSO');
          }

          if (options.clusters.length !== 1) {
            throw new Error(
              'Exactly one cluster must be specified for adding to Lens'
            );
          }

          _ssoFinishAddClusters(options);
        }
      },

      /**
       * Cancels an outstanding SSO-based request to add clusters, putting the provider
       *  into an error state.
       * @params {Object} options
       * @param {string} [options.reason] Reason for cancelation (becomes error message).
       *  Defaults to "user canceled" message.
       * @param {boolean} [options.notify] If true, error notification will be displayed;
       *  otherwise, error is silent.
       */
      ssoCancelAddClusters({
        reason = strings.clusterActionsProvider.error.sso.addClustersUserCanceled(),
        notify = false,
      } = {}) {
        if (pr.store.ssoAddClustersInProgress) {
          pr.store.ssoAddClustersInProgress = false;
          pr.loading = false;
          pr.loaded = true;
          pr.error = reason;

          if (notify) {
            pr.notifyIfError();
          }
          pr.onChange();
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
      },
    },
  };
};

export const ClusterActionsProvider = function ({ ...props }) {
  // NOTE: since the state is passed directly (by reference) into the context
  //  returned by the provider, even the initial state should be a clone of the
  //  `store` so that we consistently return a `state` property (in the context)
  //  that is a shallow clone of the `store`
  const [state, setState] = useState(pr.clone());
  const value = useMemo(() => [state, setState], [state]);

  pr.setState = setState;

  return <ClusterActionsContext.Provider value={value} {...props} />;
};
