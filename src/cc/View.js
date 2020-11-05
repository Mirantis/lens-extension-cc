import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { useExtState } from './store/ExtStateProvider';
import { useConfig } from './store/ConfigProvider';
import { useAuth } from './store/AuthProvider';
import { useClusters } from './store/ClustersProvider';
import { useAddClusters } from './store/AddClustersProvider';
import { Login } from './Login';
import { ClusterList } from './ClusterList';

const Error = styled.p(function () {
  return {
    color: 'red',
  };
});

const ViewContainer = styled.div(function () {
  // NOTE: Lens applies these styles to immediate children of its global page
  //  container:
  //  ```
  //  ClusterManager main > * {
  //    position: absolute;
  //    left: 0;
  //    top: 0;
  //    right: 0;
  //    bottom: 0;
  //    display: flex;
  //    background-color: var(--mainBackground);
  //  }
  //  ```
  //  This means ViewContainer is a flex child, and also doesn't need width/height.
  return {
    display: 'flex',
    flexDirection: 'column',

    // Lens wants to set all immediate children `ClusterManager main > * > *`
    //  to have `flex: 1`, which doesn't work for the layout we want, so
    //  forcefully reset
    '> *': {
      flex: 'none !important',
    },

    '> .ClusterList': {
      flex: '1 0 auto !important',
    },

    button: {
      width: 200,
    },
  };
});

export const View = function () {
  //
  // STATE
  //

  const {
    state: { baseUrl, authState },
    actions: extActions,
  } = useExtState();

  const {
    state: {
      loading: configLoading,
      loaded: configLoaded,
      error: configError,
      config,
    },
    actions: configActions,
  } = useConfig();

  const {
    state: { loading: authLoading, loaded: authLoaded, error: authError },
    actions: authActions,
  } = useAuth();

  const {
    state: {
      loading: clustersLoading,
      loaded: clustersLoaded,
      error: clustersError,
      data: { clusters },
    },
    actions: clustersActions,
  } = useClusters();

  const {
    state: {
      loading: addClustersLoading,
      loaded: addClustersLoaded,
      error: addClustersError,
    },
    actions: addClustersActions,
  } = useAddClusters();

  const [errorMessage, setErrorMessage] = useState(null); // @type {string}

  const loading =
    configLoading ||
    (configLoaded &&
      !configError &&
      !authLoaded &&
      authState.hasCredentials()) ||
    authLoading ||
    (authLoaded && !authError && !clustersLoaded) ||
    clustersLoading;

  //
  // EVENTS
  //

  const handleLogin = useCallback(
    function (info) {
      setErrorMessage(null);

      authState.username = info.username;
      authState.password = info.password;

      const url = info.baseUrl.replace(/\/$/, ''); // remove end slash if any

      authState.clearTokens();
      extActions.setBaseUrl(url);
      extActions.setAuthState(authState);
      authActions.reset();
      clustersActions.reset();

      configActions.load(url); // implicit reset
    },
    [authState, extActions, authActions, clustersActions, configActions]
  );

  const handleAddClick = useCallback(
    async function () {
      if (!addClustersLoading) {
        addClustersActions.addToLens({
          clusters,
          baseUrl,
          config,
          username: authState.username,
          password: authState.password,
          // DEBUG TODO: add offline choice with `offline: true/false` option
        });
      }
    },
    [
      baseUrl,
      authState,
      config,
      clusters,
      addClustersLoading,
      addClustersActions,
    ]
  );

  //
  // EFFECTS
  //

  // 1. load the config object
  useEffect(
    function () {
      if (
        baseUrl &&
        authState.hasCredentials() &&
        !configLoading &&
        !configLoaded
      ) {
        configActions.load(baseUrl);
      }
    },
    [baseUrl, authState, configLoading, configLoaded, configActions]
  );

  // 2. authenticate
  useEffect(
    function () {
      if (!configLoading && configLoaded) {
        if (configError) {
          setErrorMessage(configError);
        } else if (!authLoading && !authLoaded) {
          setErrorMessage(null);
          if (authState.isValid()) {
            // skip authentication, go straight for the clusters
            authActions.setAuthenticated();
          } else if (authState.hasCredentials()) {
            authActions.authenticate({
              authState,
              baseUrl,
              config,
            });
          }
        }
      }
    },
    [
      authState,
      baseUrl,
      configLoading,
      configLoaded,
      configError,
      config,
      authLoading,
      authLoaded,
      authActions,
    ]
  );

  // 3. get namespaces and clusters
  useEffect(
    function () {
      if (
        !clustersLoading &&
        !clustersLoaded &&
        baseUrl &&
        config &&
        authLoaded &&
        authState.isValid()
      ) {
        clustersActions.load(baseUrl, config, authState);
      } else {
        if (authLoaded && authError) {
          setErrorMessage(authError);
        } else if (clustersLoaded && clustersError) {
          setErrorMessage(clustersError);
        } else {
          setErrorMessage(null);
        }

        if (authState.changed) {
          extActions.setAuthState(authState); // capture any changes
        }
      }
    },
    [
      baseUrl,
      authState,
      extActions,
      config,
      authLoaded,
      authError,
      clustersLoading,
      clustersLoaded,
      clustersError,
      clustersActions,
    ]
  );

  //
  // RENDER
  //

  console.log(
    '[View] rendering: loading=%s, configLoading=%s, authState.hasCreds=%s, authLoading=%s, clustersLoading=%s, addClustersLoading=%s, clusters=%s',
    loading,
    configLoading,
    authState.hasCredentials(),
    authLoading,
    clustersLoading,
    addClustersLoading,
    clusters.length,
    clusters
  ); // DEBUG

  return (
    <ViewContainer>
      <h1>Add Mirantis Container Cloud Clusters</h1>
      <Login
        loading={loading}
        baseUrl={baseUrl || undefined}
        username={authState ? authState.username : undefined}
        password={authState ? authState.password : undefined}
        onLogin={handleLogin}
      />
      {errorMessage ? <Error>{errorMessage}</Error> : null}
      {!errorMessage && authState.isValid() && clustersLoaded ? (
        <>
          <ClusterList clusters={clusters} />
          <button onClick={handleAddClick}>Add selected clusters...</button>
        </>
      ) : undefined}
    </ViewContainer>
  );
};
