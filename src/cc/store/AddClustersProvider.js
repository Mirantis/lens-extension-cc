//
// Provider for adding clusters to Lens
//

import React, { createContext, useContext, useState, useMemo } from 'react';
import { promises as fs } from 'fs';
import path from 'path';
import { AuthClient } from '../auth/clients/AuthClient';
import { Store, Component } from '@k8slens/extensions';
import { kubeConfigTemplate } from '../templates';
import { AuthAccess } from '../auth/AuthAccess';
import * as strings from '../../strings';
import { workspacePrefix } from '../../constants';
import { ProviderStore } from './ProviderStore';

const { workspaceStore } = Store;
const { Notifications } = Component;

//
// Store
//

class AddClustersProviderStore extends ProviderStore {
  makeNew() {
    return {
      ...super.makeNew(),
      newWorkspaces: [], // {Array<Workspace>} list of new workspaces created, if any; shape: https://github.com/lensapp/lens/blob/00be4aa184089c1a6c7247bdbfd408665f325665/src/common/workspace-pr.store.ts#L27
    };
  }
}

const pr = new AddClustersProviderStore();

//
// Internal Methods
//

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
 *  to use to add the cluster to Lens; on error, `{error: string}`. All clusters
 *  are configured to be added to the active workspace.
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
  const errPrefix = strings.addClustersProvider.errors.kubeconfigCreate(
    cluster.id
  );

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
      workspace: workspaceStore.currentWorkspaceId,

      // ownerRef: unique ref/id (up to extension to decide what it is), if unset
      //  then Lens allows the user to remove the cluster; otherwise, only the
      //  extension itself can remove it
    },
  };
};

/**
 * Assigns each cluster to an existing or new workspace that correlates to its
 *  original MCC namespace. New workspaces are created if necessary and added
 *  to this Provider's `pr.store.newWorkspaces` list.
 * @param {Array<Cluster>} clusters Clusters being added.
 * @param {Array<ClusterModel>} models Cluster models to add to Lens. These are
 *  modified in-place.
 *
 *  NOTE: `model.id` is expected to be the ID of the related cluster.
 */
const _createNewWorkspaces = function (clusters, models) {
  const findWorkspace = (id) =>
    workspaceStore.workspacesList.find((ws) => ws.id === id);
  const findCluster = (id) => clusters.find((cluster) => cluster.id === id);

  models.forEach((model) => {
    const cluster = findCluster(model.id);
    const wsId = `${workspacePrefix}${cluster.namespace}`;
    const workspace = findWorkspace(wsId);

    model.workspace = wsId; // re-assign cluster to custom workspace

    if (!workspace) {
      // create new workspace
      // @see https://github.com/lensapp/lens/blob/00be4aa184089c1a6c7247bdbfd408665f325665/src/common/workspace-pr.store.ts#L27
      // NOTE: the Workspace class should be a global but Lens 4.0.0-alpha.5 is
      //  not providing it (only the type declaration via its `@k8slens/extensions`
      //  package, but the class is still available as part of the Store global
      const ws = new Store.Workspace({
        id: wsId,
        name: wsId,
        description: strings.addClustersProvider.workspaces.description(),
      });

      workspaceStore.addWorkspace(ws);
      pr.store.newWorkspaces.push(ws);
    }
  });
};

/**
 * Posts a notification about new workspaces created, and switches to the first
 *  new workspace in `pr.store.newWorkspaces` in Lens.
 * @throws {Error} If `pr.store.newWorkspaces` is empty.
 */
const _notifyAndSwitchToNew = function () {
  if (pr.store.newWorkspaces.length <= 0) {
    throw new Error(
      '[lens-extension-cc/AddClustersProvider._notifyAndSwitchToNew] There must be at least one new workspace to switch to!'
    );
  }

  // notify all new workspace names
  Notifications.info(
    <p
      dangerouslySetInnerHTML={{
        __html: strings.addClustersProvider.notifications.newWorkspacesHtml(
          pr.store.newWorkspaces.map((ws) => ws.name)
        ),
      }}
    />
  );

  // activate the first new workspace
  const firstWorkspace = pr.store.newWorkspaces[0];
  Store.workspaceStore.setActive(firstWorkspace.id);
  Notifications.info(
    <p
      dangerouslySetInnerHTML={{
        __html: strings.addClustersProvider.notifications.workspaceActivated(
          firstWorkspace.name
        ),
      }}
    />
  );
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
 * @param {boolean} [options.addToNew] If true, the clusters will be added
 *  to new (or existing if the workspaces already exist) workspaces that
 *  correlate to their original MCC namespaces; otherwise, they will all
 *  be added to the active workspace.
 */
const _addToLens = async function ({
  clusters,
  savePath,
  baseUrl,
  config,
  username,
  password,
  offline = false,
  addToNew = false,
}) {
  pr.reset(true);

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

  pr.store.loading = false;
  pr.store.loaded = true;

  // abort if there's at least one error
  if (failure) {
    pr.store.error = failure.error;
  } else {
    const models = results.map(({ model }) => model);

    if (addToNew) {
      _createNewWorkspaces(clusters, models);
    }

    models.forEach((model) => {
      Store.clusterStore.addCluster(model);
    });

    if (addToNew && pr.store.newWorkspaces.length > 0) {
      _notifyAndSwitchToNew();
    }
  }

  pr.notifyIfError();
  pr.onChange();
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
  const [state] = context;

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
       * @param {boolean} [options.addToNew] If true, the clusters will be added
       *  to new (or existing if the workspaces already exist) workspaces that
       *  correlate to their original MCC namespaces; otherwise, they will all
       *  be added to the active workspace.
       */
      addToLens(options) {
        if (!pr.store.loading && options.clusters.length > 0) {
          console.log(
            '[AddClustersProvider] adding %s clusters to %s...',
            options.clusters.length,
            options.savePath
          ); // DEBUG
          _addToLens(options);
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

export const AddClustersProvider = function (props) {
  // NOTE: since the state is passed directly (by reference) into the context
  //  returned by the provider, even the initial state should be a clone of the
  //  `store` so that we consistently return a `state` property (in the context)
  //  that is a shallow clone of the `store`
  const [state, setState] = useState(pr.clone());
  const value = useMemo(() => [state, setState], [state]);

  pr.setState = setState;

  return <AddClustersContext.Provider value={value} {...props} />;
};
