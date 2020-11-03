import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Login } from './Login';
import { useExtState } from './store/ExtStateProvider';
import { useConfig } from './store/ConfigProvider';
import { useAuth } from './store/AuthProvider';
import { useClusters } from './store/ClustersProvider';
import { layout } from './theme';

const ViewContainer = styled.div(function () {
  return {
    display: 'flex',
    flexDirection: 'column',
    width: '100vw',
    height: '100vh',

    header: {
      width: '100%',
      height: 50,
      display: 'flex',
      alignItems: 'center',
      backgroundColor: 'lightgray',
      marginBottom: layout.grid * 4,
      padding: layout.pad,
    },
  };
});

export const View = function () {
  //
  // STATE
  //

  const { state: { baseUrl, authState }, actions: extActions } = useExtState();

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
    state: {
      loading: authLoading,
      loaded: authLoaded,
      error: authError,
    },
    actions: authActions,
  } = useAuth();

  const {
    state: {
      loading: clustersLoading,
      loaded: clustersLoaded,
      error: clustersError,
      data: {
        namespaces,
        clusters,
      }
    },
    actions: clustersActions,
  } = useClusters();

  const [userCreds, setUserCreds] = useState(null); // @type {{username: string, password: string}|null}
  const [errorMessage, setErrorMessage] = useState(null); // @type {string}

  const loading = configLoading || authLoading || clustersLoading;

  //
  // EVENTS
  //

  const handleLogin = function (info) {
    setErrorMessage(null);
    setUserCreds({ username: info.username, password: info.password });

    const url = info.baseUrl.replace(/\/$/, ''); // remove end slash if any

    authState.clearTokens();
    extActions.setBaseUrl(url);
    extActions.setAuthState(authState);
    authActions.reset();
    clustersActions.reset();

    configActions.load(url); // implicit reset
  };

  //
  // EFFECTS
  //

  useEffect(function () {
    if (baseUrl && authState.isValid() && !configLoading && !configLoaded) {
      configActions.load(baseUrl);
    }
  }, [baseUrl, authState, configLoading, configLoaded, configActions]);

  useEffect(function () {
    if (!configLoading && configLoaded) {
      if (configError) {
        setErrorMessage(configError);
      } else if (!authLoading && !authLoaded) {
        setErrorMessage(null);
        if (authState.isValid()) {
          // skip authentication, go straight for the clusters
          authActions.setAuthenticated();
        } else if (userCreds) {
          authActions.authenticate({ authState, baseUrl, config, ...userCreds });
        }
      }
    }
  }, [
    authState,
    baseUrl,
    userCreds,
    configLoading,
    configLoaded,
    configError,
    config,
    authLoading,
    authLoaded,
    authActions,
  ]);

  useEffect(function () {
    if (!clustersLoading && !clustersLoaded && baseUrl && config && authLoaded && authState.isValid()) {
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
  }, [
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
  ]);

  //
  // RENDER
  //

  return (
    <ViewContainer>
      <Login
        loading={loading}
        errorMessage={errorMessage}
        baseUrl={baseUrl || undefined}
        username={authState ? authState.username : undefined}
        onLogin={handleLogin}
      />
    </ViewContainer>
  );
};
