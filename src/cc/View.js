import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { Component } from '@k8slens/extensions';
import { useExtState } from './store/ExtStateProvider';
import { useConfig } from './store/ConfigProvider';
import { useAuth } from './store/AuthProvider';
import { useClusters } from './store/ClustersProvider';
import { useAddClusters } from './store/AddClustersProvider';
import { Login } from './Login';
import { ClusterList } from './ClusterList';
import { AddClusters } from './AddClusters';
import * as strings from '../strings';
import { layout, mixinFlexColumnGaps, mixinCustomScrollbar } from './styles';

const { Notifications } = Component;

const Container = styled.div(function () {
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    padding: layout.gap,
    backgroundColor: 'var(--mainBackground)',
  };
});

const getColumnStyles = function (theme) {
  return {
    // as flex children, grow/shrink evenly
    flex: 1,

    // as flex containers
    ...mixinFlexColumnGaps(layout.grid * 6),

    borderRadius: layout.grid,
    backgroundColor: 'var(--contentColor)',
    marginRight: layout.gap,
    padding: layout.gap,
    ...mixinCustomScrollbar({ theme }),
  };
};

const MainColumn = styled.div(function ({ theme }) {
  return {
    ...getColumnStyles(theme),
  };
});

const HelpColumn = styled.div(function ({ theme }) {
  return {
    ...getColumnStyles(theme),
    marginRight: 0,

    '> p': {
      marginBottom: layout.gap,
    },
  };
});

export const View = function () {
  //
  // STATE
  //

  const {
    state: { baseUrl, authAccess },
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
      newWorkspaces,
    },
    actions: addClustersActions,
  } = useAddClusters();

  // @type {null|Array<Cluster>} null until clusters are loaded, then an array
  //  that represents the current selection, could be empty
  const [selectedClusters, setSelectedClusters] = useState(null);

  const loading =
    configLoading ||
    (configLoaded &&
      !configError &&
      !authLoaded &&
      authAccess.hasCredentials()) ||
    authLoading ||
    (authLoaded && !authError && !clustersLoaded) ||
    clustersLoading ||
    addClustersLoading;

  // in order of execution/precedence
  const errorMessage =
    configError || authError || clustersError || addClustersError || null;

  //
  // EVENTS
  //

  const handleLogin = useCallback(
    function (info) {
      authAccess.username = info.username;
      authAccess.password = info.password;

      const url = info.baseUrl.replace(/\/$/, ''); // remove end slash if any

      authAccess.clearTokens();
      extActions.setBaseUrl(url);
      extActions.setAuthAccess(authAccess);
      authActions.reset();
      clustersActions.reset();

      configActions.load(url); // implicit reset of current config
    },
    [authAccess, extActions, authActions, clustersActions, configActions]
  );

  const handleClusterSelection = useCallback(
    function ({ cluster, selected }) {
      const idx = selectedClusters.indexOf(cluster);
      if (selected && idx < 0) {
        setSelectedClusters(selectedClusters.concat(cluster));
      } else if (!selected && idx >= 0) {
        const newSelection = selectedClusters.concat();
        newSelection.splice(idx, 1);
        setSelectedClusters(newSelection);
      }
    },
    [selectedClusters]
  );

  const handleClusterSelectAll = useCallback(
    function ({ selected }) {
      setSelectedClusters(selected ? clusters.concat() : []);
    },
    [clusters]
  );

  const handleClustersAdd = useCallback(
    function ({ savePath, offline, addToNew }) {
      if (!addClustersLoading) {
        addClustersActions.addToLens({
          clusters: selectedClusters,
          savePath,
          baseUrl,
          config,
          username: authAccess.username,
          password: authAccess.password,
          offline,
          addToNew,
        });
      }
    },
    [
      baseUrl,
      authAccess,
      config,
      selectedClusters,
      addClustersLoading,
      addClustersActions,
    ]
  );

  //
  // EFFECTS
  //

  // display any error messages that might come up
  useEffect(
    function () {
      if (configLoaded && configError) {
        Notifications.error(configError);
      } else if (authLoaded && authError) {
        Notifications.error(authError);
      } else if (clustersLoaded && clustersError) {
        Notifications.error(clustersError);
      } else if (addClustersLoaded && addClustersError) {
        Notifications.error(addClustersError);
      }
    },
    [
      configLoaded,
      configError,
      authLoaded,
      authError,
      clustersLoaded,
      clustersError,
      addClustersLoaded,
      addClustersError,
    ]
  );

  useEffect(
    function () {
      if (addClustersLoaded && newWorkspaces.length > 0) {
        Notifications.info(
          strings.view.notifications.newWorkspaces(
            newWorkspaces.map((ws) => ws.name)
          )
        );
      }
    },
    [addClustersLoaded, newWorkspaces]
  );

  // 1. load the config object
  useEffect(
    function () {
      if (
        baseUrl &&
        authAccess.hasCredentials() &&
        !configLoading &&
        !configLoaded
      ) {
        configActions.load(baseUrl);
      }
    },
    [baseUrl, authAccess, configLoading, configLoaded, configActions]
  );

  // 2. authenticate
  useEffect(
    function () {
      if (
        !configLoading &&
        configLoaded &&
        !configError &&
        !authLoading &&
        !authLoaded
      ) {
        if (authAccess.isValid()) {
          // skip authentication, go straight for the clusters
          authActions.setAuthenticated();
        } else if (authAccess.hasCredentials()) {
          authActions.authenticate({
            authAccess,
            baseUrl,
            config,
          });
        }
      }
    },
    [
      configLoading,
      configLoaded,
      configError,
      authLoading,
      authLoaded,
      authActions,
      authAccess,
      baseUrl,
      config,
    ]
  );

  // 3. get clusters
  useEffect(
    function () {
      if (
        !clustersLoading &&
        !clustersLoaded &&
        baseUrl &&
        config &&
        authLoaded &&
        authAccess.isValid()
      ) {
        clustersActions.load(baseUrl, config, authAccess);
      } else if (authAccess.changed) {
        extActions.setAuthAccess(authAccess); // capture any changes after loading clusters
      }
    },
    [
      baseUrl,
      authAccess,
      extActions,
      config,
      authLoaded,
      clustersLoading,
      clustersLoaded,
      clustersActions,
    ]
  );

  // 4. set initial selection after cluster load
  useEffect(
    function () {
      if (clustersLoading && selectedClusters) {
        setSelectedClusters(null); // clear selection because we (re-)loading clusters
      } else if (clustersLoaded && !selectedClusters) {
        // set initial selection
        setSelectedClusters(clusters.concat()); // shallow clone the array to disassociate from source
      }
    },
    [clustersLoading, clustersLoaded, clusters, selectedClusters]
  );

  //
  // RENDER
  //

  console.log(
    '[View] rendering: loading=%s, configLoading=%s, authAccess.hasCreds=%s, authLoading=%s, clustersLoading=%s, addClustersLoading=%s, clusters=%s',
    loading,
    configLoading,
    authAccess.hasCredentials(),
    authLoading,
    clustersLoading,
    addClustersLoading,
    clusters.length,
    clusters
  ); // DEBUG

  return (
    <Container className="lecc-View">
      <MainColumn>
        <h2>{strings.view.main.title()}</h2>
        <Login
          loading={loading && !addClustersLoading}
          disabled={loading}
          baseUrl={baseUrl || undefined}
          username={authAccess ? authAccess.username : undefined}
          password={authAccess ? authAccess.password : undefined}
          onLogin={handleLogin}
        />
        {!errorMessage &&
        authAccess.isValid() &&
        clustersLoaded &&
        selectedClusters ? (
          // DEBUG
          <>
            <ClusterList
              clusters={clusters} // DEBUG
              selectedClusters={selectedClusters} // DEBUG
              onSelection={handleClusterSelection}
              onSelectAll={handleClusterSelectAll}
            />
            <AddClusters
              clusters={selectedClusters} // DEBUG
              onAdd={handleClustersAdd}
            />
          </>
        ) : undefined}
      </MainColumn>
      <HelpColumn
        dangerouslySetInnerHTML={{ __html: strings.view.help.html() }}
      />
    </Container>
  );
};
