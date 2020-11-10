import React, { useState, useEffect, useCallback } from 'react';
import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { useExtState } from './store/ExtStateProvider';
import { useConfig } from './store/ConfigProvider';
import { useAuth } from './store/AuthProvider';
import { useClusters } from './store/ClustersProvider';
import { useAddClusters } from './store/AddClustersProvider';
import { Login } from './Login';
import { ClusterList } from './ClusterList';
import { AddClusters } from './AddClusters';
import * as strings from '../strings';
import { layout } from './theme';

const Container = styled.div(function () {
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
    // DEBUG '--flex-gap': `${layout.grid * 6}px`, // override default (1em), match what Lens seems to use

    padding: layout.gap,

    // DEBUG REMOVE?
    // '> *': {
    //   // Lens wants to set all immediate children `ClusterManager main > * > *`
    //   //  to have `flex: 1`, which doesn't work for the layout we want, so
    //   //  forcefully reset
    //   flex: 'none !important',

    // DEBUG REMOVE?
    //   marginBottom: layout.grid * 6,
    // },

    // DEBUG REMOVE?
    // '> *:last-child': {
    //   marginBottom: 0,
    // },

    // DEBUG REMOVE?
    // '> .lecc-ClusterList': {
    //   flex: '1 0 auto !important',
    // },
  };
});

const columnStyles = {
  borderRadius: layout.grid,
  backgroundColor: 'var(--contentColor)',
  marginRight: layout.gap,
  padding: layout.gap,

  '> *': {
    marginBottom: layout.grid * 6,
  },

  '> *:last-child': {
    marginBottom: 0,
  },
};

const MainColumn = styled.div(function () {
  return {
    ...columnStyles,
  };
});

const HelpColumn = styled.div(function () {
  return {
    ...columnStyles,
    marginRight: 0,

    '> p': {
      marginBottom: layout.gap,
    },
  };
});

// DEBUG TODO: Lens may already have an error notification type thing to use?
const Error = styled.p(function () {
  return {
    backgroundColor: 'var(--colorError)',
    borderColor: 'var(--colorSoftError)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: layout.grid,
    color: 'white',
    padding: layout.pad,
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
    },
    actions: addClustersActions,
  } = useAddClusters();

  const [errorMessage, setErrorMessage] = useState(null); // @type {string}

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
      setErrorMessage(null);

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
    function ({ savePath, offline }) {
      if (!addClustersLoading) {
        addClustersActions.addToLens({
          clusters: selectedClusters,
          savePath,
          baseUrl,
          config,
          username: authAccess.username,
          password: authAccess.password,
          offline,
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
        setErrorMessage(configError);
      } else if (authLoaded && authError) {
        setErrorMessage(authError);
      } else if (clustersLoaded && clustersError) {
        setErrorMessage(clustersError);
      } else if (addClustersLoaded && addClustersError) {
        setErrorMessage(addClustersError);
      } else {
        setErrorMessage(null);
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
    <Container className="lecc-View flex">
      <MainColumn className="flex column">
        <h2>{strings.view.main.title()}</h2>
        {errorMessage ? (
          // DEBUG TODO switch to adding/removing Notification to Lens?
          <Error>{errorMessage}</Error>
        ) : null}
        <Login
          loading={loading}
          baseUrl={baseUrl || undefined}
          username={authAccess ? authAccess.username : undefined}
          password={authAccess ? authAccess.password : undefined}
          onLogin={handleLogin}
        />
        {!errorMessage &&
        authAccess.isValid() &&
        clustersLoaded &&
        selectedClusters ? (
          <>
            <ClusterList
              clusters={clusters} // DEBUG TEST: undefined
              selectedClusters={selectedClusters} // DEBUG TEST: undefined
              onSelection={handleClusterSelection}
              onSelectAll={handleClusterSelectAll}
            />
            <AddClusters
              clusters={selectedClusters}
              onAdd={handleClustersAdd}
            />
          </>
        ) : undefined}
      </MainColumn>
      <HelpColumn
        className="flex column"
        dangerouslySetInnerHTML={{ __html: strings.view.help.html() }}
      />
    </Container>
  );
};

View.propTypes = {
  extension: propTypes.object.isRequired, // @type {LensRendererExtension}
};
