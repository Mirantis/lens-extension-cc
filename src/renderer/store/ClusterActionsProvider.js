//
// Provider for adding clusters to Lens
//

import { createContext, useContext, useState, useMemo } from 'react';
import * as rtv from 'rtvjs';
import { promises as fs } from 'fs';
import path from 'path';
import { Store, Component, Util, Catalog } from '@k8slens/extensions';
import { AuthClient } from '../auth/clients/AuthClient';
import { kubeConfigTemplate } from '../../util/templates';
import { AuthAccess } from '../auth/AuthAccess';
import * as strings from '../../strings';
import { ProviderStore } from './ProviderStore';
import { Cluster } from './Cluster';
import { logger } from '../../util/logger';
import { extractJwtPayload } from '../auth/authUtil';
import { source as catalogSource } from './CatalogSource';
import pkg from '../../../package.json';

const { Notifications } = Component;

// OAuth2 'state' parameter value to use when requesting tokens for one cluster out of many
export const SSO_STATE_ADD_CLUSTERS = 'add-clusters';

//
// RTV Typesets used for validations
//

const clusterModelTs = DEV_ENV
  ? {
      metadata: {
        uid: rtv.STRING,
        name: rtv.STRING,
        source: [rtv.OPTIONAL, rtv.STRING],
        labels: [rtv.OPTIONAL, rtv.HASH_MAP, {
          $values: rtv.STRING,
        }]
      },
      spec: {
        kubeconfigPath: rtv.STRING,
        kubeconfigContext: rtv.STRING,
      },
      status: {
        phase: [rtv.STRING, { oneOf: ['connected', 'disconnected'] } ],
      }
    }
  : undefined;

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
  // TODO[catalog]: how to search all existing clusters? look in the source?

  const existingLensClusters = [];
  const clusterId = cluster instanceof Cluster ? cluster.id : cluster;

  return existingLensClusters.find(
    (lensCluster) => lensCluster.id === clusterId
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
 * @returns {Promise<Object>} On success, `{authAccess: AuthAccess}`, a new AuthAccess
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

  let authAccess;
  if (error) {
    logger.error(
      'ClusterActionsProvider._ssoGetClusterAccess()',
      `Failed to get tokens from authorization code, error="${error}"`
    );
    error = strings.clusterActionsProvider.error.sso.authCode(cluster.id);
  } else {
    const jwt = extractJwtPayload(body.id_token);
    if (jwt.preferred_username) {
      authAccess = new AuthAccess({
        username: jwt.preferred_username,
        usesSso: true,
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

  return { authAccess, error };
};

/**
 * [ASYNC] Writes a kubeConfig to the local disk for the given cluster.
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
        uid: clusterId,
        name: clusterName,
      },
      spec: {
        kubeconfigPath,
        kubeconfigContext: kubeConfig.contexts[0].name, // must be same context name used in the kubeConfig file
      },
      status: {
        phase: 'disconnected',
      }
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
 * [ASYNC] Switch to the specified cluster (and associated workspace).
 * @param {string} clusterId ID of the cluster in Lens. Can be in any workspace,
 *  even if it's not the active one.
 */
const _switchToCluster = async function (clusterId) {
  await Store.workspaceStore.setActiveCluster(clusterId);
};

/**
 * Adds metadata to cluster models to prepare them to be added to the Lens Catalog.
 * @param {string} cloudUrl MCC instance base URL that owns all the clusters.
 * @param {Array<{namespace: string, id: string, name: string}>} clusterPartials
 *  Clusters being added. Subset of full `./Cluster.js` class properties.
 * @param {Array<ClusterModel>} models List of models for clusters to add, one for each
 *  item in `clusters`. See `clusterModelTs` typeset for interface.
 */
const _addMetadata = function (cloudUrl, clusterPartials, models) {
  DEV_ENV && rtv.verify(
    {
      cloudUrl,
      clusterPartials,
      models,
    },
    {
      cloudUrl: rtv.STRING,
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
    //  metadata properties are also supporeted

    // Lens-specific optional metadata
    model.metadata.source = pkg.name;
    model.metadata.labels = {
      namespace: partial.namespace, // TODO[catalog] add custom prefix to this?
    };

    // custom metdata
    // NOTE: `metadata.uid` and `metadata.name` will already be set to the cluster
    //  ID and name from `_writeKubeConfig()`
    model.metadata.cloudUrl = cloudUrl;
  });
};

/**
 * Adds one or more clusters to the Lens Catalog.
 * @param {Array<ClusterModel>} models List of models for clusters to add, one for each
 *  item in `clusters`. See `clusterModelTs` typeset for interface.
 */
const _addToCatalog = function (models) {
  DEV_ENV && rtv.verify({ models }, { models: [[clusterModelTs]] });

  models.forEach((model) => {
    // officially add to Lens
    // TODO[catalog]: need to save the model to a Store so we can restore it on load...
    catalogSource.push(new Catalog.KubernetesCluster(model));
  });
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
 * @param {boolean} [options.addToNew] If true, the clusters will be added
 *  to new (or existing if the workspaces already exist) workspaces that
 *  correlate to their original MCC namespaces; otherwise, they will all
 *  be added to the active workspace.
 */
const _addClusterKubeConfigs = async function ({
  cloudUrl,
  newClusters,
  promises,
  savePath,
  addToNew = false,
}) {
  // these promises are designed NOT to reject
  let results = await Promise.all(promises); // {Array<{cluster: Cluster, kubeConfig: Object}>} on success
  let failure = results.find((res) => !!res.error); // look for any errors, use first-found

  if (!failure) {
    // write each kubeConfig to disk
    promises = results.map(({ cluster, kubeConfig }) =>
      _writeKubeConfig({
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

  pr.loading = false;
  pr.loaded = true;

  if (failure) {
    pr.error = failure.error;
  } else {
    const models = results.map(({ model }) => model);

    _addMetadata(cloudUrl, newClusters, models);
    _addToCatalog(models);

    if (newClusters.length > 0) {
      _notifyNewClusters(newClusters);
    }
  }
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
 * @param {boolean} [options.addToNew] If true, the clusters will be added
 *  to new (or existing if the workspaces already exist) workspaces that
 *  correlate to their original MCC namespaces; otherwise, they will all
 *  be added to the active workspace.
 * @throws {Error} If the store is not aware of a pending 'add clusters' operation.
 */
const _ssoFinishAddClusters = async function ({
  oAuth,
  clusters,
  savePath,
  cloudUrl,
  config,
  addToNew = false,
  offline = false,
}) {
  if (!pr.store.ssoAddClustersInProgress) {
    throw new Error('A pending "add clusters" operation must be in progress');
  }

  if (clusters.length !== 1) {
    throw new Error('Expecting exactly one cluster to add');
  }

  const cluster = clusters[0];
  const { error: accessError, authAccess } = await _getClusterAccess({
    cluster,
    oAuth,
    config,
    offline,
  });

  if (accessError) {
    pr.error = accessError;
  } else {
    _addClusterKubeConfigs({
      cloudUrl,
      newClusters: [cluster],
      existingClusters: [],
      promises: [
        Promise.resolve({
          cluster,
          kubeConfig: kubeConfigTemplate({
            username: authAccess.username,
            token: authAccess.token,
            refreshToken: authAccess.refreshToken,
            cluster,
          }),
        }),
      ],
      savePath,
      addToNew,
    });
  }

  pr.store.ssoAddClustersInProgress = false;
  pr.loading = false;
  pr.loaded = true;
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
  addToNew = false,
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
      _addMetadata(cloudUrl, [partial], [model]);
      _addToCatalog([model]);
      pr.store.kubeClusterAdded = true;

      _notifyNewClusters([{ namespace, id: clusterId, name: clusterName }]);

      // NOTE: this is async but we don't need to wait on it
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
const _activateCluster = function ({ namespace, clusterName, clusterId }) {
  pr.reset(true);

  const lensCluster = _getLensCluster(clusterId);

  if (lensCluster) {
    // NOTE: this is async but we don't need to wait on it
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
       * @param {boolean} [options.addToNew] If true, the clusters will be added
       *  to new (or existing if the workspaces already exist) workspaces that
       *  correlate to their original MCC namespaces; otherwise, they will all
       *  be added to the active workspace.
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
