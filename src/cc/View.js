import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import rtv from 'rtvjs';
import { Component } from '@k8slens/extensions';
import { useExtState } from './store/ExtStateProvider';
import { useConfig } from './store/ConfigProvider';
import { useAuth } from './store/AuthProvider';
import { useClusters } from './store/ClustersProvider';
import { useClusterActions } from './store/ClusterActionsProvider';
import { Login } from './Login';
import { ClusterList } from './ClusterList';
import { AddClusters } from './AddClusters';
import { Loader } from './Loader';
import { ErrorPanel } from './ErrorPanel';
import { InfoPanel } from './InfoPanel';
import { PreferencesPanel } from './PreferencesPanel';
import * as strings from '../strings';
import { layout, mixinFlexColumnGaps } from './styles';
import {
  EXT_EVENT_ACTIVATE_CLUSTER,
  EXT_EVENT_ADD_CLUSTERS,
  EXT_EVENT_KUBECONFIG,
  extEventActivateClusterTs,
  extEventAddClustersTs,
  extEventKubeconfigTs,
  addExtEventHandler,
  removeExtEventHandler,
} from '../eventBus';
import { normalizeUrl } from './netUtil';

//
// INTERNAL STYLED COMPONENTS
//

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

    // style all <code> elements herein
    code: {
      // TODO: remove once https://github.com/lensapp/lens/issues/1683 is fixed
      fontSize: 'calc(var(--font-size) * .9)',
    },
  };
});

const getColumnStyles = function () {
  return {
    // as flex children, grow/shrink evenly
    flex: 1,

    // as flex containers
    ...mixinFlexColumnGaps(layout.grid * 6),

    borderRadius: layout.grid,
    backgroundColor: 'var(--contentColor)',
    marginRight: layout.gap,
    padding: layout.gap,
    overflow: 'auto',
  };
};

const MainColumn = styled.div(function () {
  return {
    ...getColumnStyles(),
  };
});

const HelpColumn = styled.div(function () {
  return {
    ...getColumnStyles(),
    justifyContent: 'space-between', // push PreferencesPanel to the bottom
    marginRight: 0,
  };
});

const HelpContent = styled.div(function () {
  return {
    'h2, h3, > p': {
      marginBottom: layout.gap,
    },

    'p:last-child': {
      marginBottom: 0,
    },
  };
});

const Title = styled.div(function () {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',

    h2: {
      marginRight: layout.gap,
    },
  };
});

//
// MAIN COMPONENT
//

export const View = function () {
  //
  // STATE
  //

  const {
    state: { cloudUrl, authAccess, addToNew, offline, savePath },
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
      error: addClustersError,
      kubeClusterAdded,
    },
    actions: clusterActions,
  } = useClusterActions();

  // @type {null|Array<Cluster>} null until clusters are loaded, then an array
  //  that represents the current selection, could be empty
  const [selectedClusters, setSelectedClusters] = useState(null);

  // @type {string|null} if set, the type of extension event (from the `eventBus`) that
  //  is currently being handled; otherwise, the extension is in its 'normal' state
  const [activeEventType, setActiveEventType] = useState(null);

  // name of the cluster being added/skipped/activated via an event; null if not
  //  processing an EXT_EVENT_KUBECONFIG or EXT_EVENT_ACTIVATE_CLUSTER event
  const [eventClusterName, setEventClusterName] = useState(null);

  // @type {string} message to show in Loader; null if none
  const [loaderMessage, setLoaderMessage] = useState(null);

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

  // @type {string|null} in order of execution/precedence
  const errMessage =
    configError || authError || clustersError || addClustersError || null;

  //
  // EVENTS
  //

  const handleLogin = useCallback(
    function (info) {
      authAccess.username = info.username;
      authAccess.password = info.password;

      const url = normalizeUrl(info.cloudUrl);

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
    function ({ password }) {
      if (!addClustersLoading) {
        clusterActions.addClusters({
          clusters: selectedClusters,
          savePath,
          cloudUrl,
          config,
          username: authAccess.username,
          password: password || authAccess.password,
          offline,
          addToNew,
        });
      }
    },
    [
      cloudUrl,
      authAccess,
      savePath,
      addToNew,
      offline,
      config,
      selectedClusters,
      addClustersLoading,
      clusterActions,
    ]
  );

  const handleCloseClick = useCallback(
    function () {
      // reset View back to login with current auth in case still valid
      setActiveEventType(null);
      setLoaderMessage(null);
      setEventClusterName(null);
      configActions.reset();
      authActions.reset();
      clustersActions.reset();
      setSelectedClusters([]);
      clusterActions.reset();
    },
    [configActions, authActions, clustersActions, clusterActions]
  );

  const handleActivateClusterEvent = useCallback(
    function (event) {
      console.log('[View] received activateCluster event', event); // DEBUG
      rtv.verify({ event }, { event: extEventActivateClusterTs });

      const { data } = event;

      if (!addClustersLoading) {
        setActiveEventType(EXT_EVENT_ACTIVATE_CLUSTER);
        setLoaderMessage(
          strings.view.main.loaders.activateCluster(
            `${data.namespace}/${data.clusterName}`
          )
        );
        setEventClusterName(`${data.namespace}/${data.clusterName}`);
        clusterActions.activateCluster(data);
      }
    },
    [addClustersLoading, clusterActions]
  );

  const handleAddClustersEvent = useCallback(
    function (event) {
      console.log('[View] received clusters event', event); // DEBUG
      rtv.verify({ event }, { event: extEventAddClustersTs });

      const { data } = event;

      authAccess.username = data.username;
      authAccess.password = null;
      authAccess.updateTokens(data.tokens);

      const url = normalizeUrl(data.cloudUrl);
      extActions.setBaseUrl(url);
      extActions.setAuthAccess(authAccess);

      authActions.reset();
      clustersActions.reset();

      setActiveEventType(EXT_EVENT_ADD_CLUSTERS);
      setLoaderMessage(strings.view.main.loaders.addClustersHtml(url));
      configActions.load(url); // implicit reset of current config
    },
    [authAccess, authActions, extActions, clustersActions, configActions]
  );

  const handleKubeconfigEvent = useCallback(
    function (event) {
      console.log('[View] received kubeconfig event', event); // DEBUG
      rtv.verify({ event }, { event: extEventKubeconfigTs });

      const { data } = event;

      if (!addClustersLoading) {
        setActiveEventType(EXT_EVENT_KUBECONFIG);
        setLoaderMessage(
          strings.view.main.loaders.addKubeCluster(
            `${data.namespace}/${data.clusterName}`
          )
        );
        setEventClusterName(`${data.namespace}/${data.clusterName}`);
        clusterActions.addKubeCluster({
          savePath,
          addToNew,
          ...data,
        });
      }
    },
    [savePath, addToNew, addClustersLoading, clusterActions]
  );

  //
  // EFFECTS
  //

  useEffect(
    function () {
      addExtEventHandler(
        EXT_EVENT_ACTIVATE_CLUSTER,
        handleActivateClusterEvent
      );
      addExtEventHandler(EXT_EVENT_ADD_CLUSTERS, handleAddClustersEvent);
      addExtEventHandler(EXT_EVENT_KUBECONFIG, handleKubeconfigEvent);

      return function () {
        removeExtEventHandler(
          EXT_EVENT_ACTIVATE_CLUSTER,
          handleActivateClusterEvent
        );
        removeExtEventHandler(EXT_EVENT_ADD_CLUSTERS, handleAddClustersEvent);
        removeExtEventHandler(EXT_EVENT_KUBECONFIG, handleKubeconfigEvent);
      };
    },
    [handleActivateClusterEvent, handleAddClustersEvent, handleKubeconfigEvent]
  );

  // 1. load the config object
  useEffect(
    function () {
      if (
        cloudUrl &&
        authAccess.hasCredentials() &&
        !configLoading &&
        !configLoaded
      ) {
        configActions.load(cloudUrl);
      }
    },
    [cloudUrl, authAccess, configLoading, configLoaded, configActions]
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
        if (authAccess.isValid(!activeEventType)) {
          // skip authentication, go straight for the clusters
          authActions.setAuthenticated();
        } else if (authAccess.hasCredentials()) {
          authActions.authenticate({
            authAccess,
            cloudUrl,
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
      cloudUrl,
      config,
      activeEventType,
    ]
  );

  // 3. get clusters
  useEffect(
    function () {
      if (
        !clustersLoading &&
        !clustersLoaded &&
        cloudUrl &&
        config &&
        authLoaded &&
        authAccess.isValid(!activeEventType)
      ) {
        clustersActions.load(cloudUrl, config, authAccess);
      } else if (authAccess.changed) {
        extActions.setAuthAccess(authAccess); // capture any changes after loading clusters
      }
    },
    [
      cloudUrl,
      authAccess,
      extActions,
      config,
      authLoaded,
      clustersLoading,
      clustersLoaded,
      clustersActions,
      activeEventType,
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
      } else if (clustersLoaded && activeEventType === EXT_EVENT_ADD_CLUSTERS) {
        setLoaderMessage(null); // don't show the loader again when user actually adds the clusters
      }
    },
    [
      clustersLoading,
      clustersLoaded,
      clusters,
      selectedClusters,
      activeEventType,
    ]
  );

  //
  // RENDER
  //

  const title =
    activeEventType === EXT_EVENT_KUBECONFIG
      ? strings.view.main.titles.kubeConfig()
      : activeEventType === EXT_EVENT_ACTIVATE_CLUSTER
      ? strings.view.main.titles.activateCluster()
      : strings.view.main.titles.generic();

  return (
    <Container className="lecc-View">
      <MainColumn>
        {/* include X (close) only if we're handling an extension event */}
        <Title>
          <h2>{title}</h2>
          {activeEventType && (
            <Component.Icon
              material="close"
              interactive
              big
              title={strings.view.main.close()}
              onClick={handleCloseClick}
            />
          )}
        </Title>

        {/* only show Login if we are NOT handling an extension event */}
        {!activeEventType && (
          <Login
            loading={loading && !addClustersLoading}
            disabled={loading}
            cloudUrl={cloudUrl || undefined}
            username={authAccess ? authAccess.username : undefined}
            password={authAccess ? authAccess.password : undefined}
            onLogin={handleLogin}
          />
        )}

        {/* show loader only if we have a message to show, which is typically only when we're handling an EXT_EVENT_* event */}
        {loading && loaderMessage && <Loader message={loaderMessage} />}

        {/* show error in UI on top of notification (since they disappear) when handling an event */}
        {activeEventType && !!errMessage && (
          <ErrorPanel>{errMessage}</ErrorPanel>
        )}

        {/*
          when handling the EXT_EVENT_KUBECONFIG event, show the result in the UI even though
           user won't see it since we activate the cluster; just in case, as a neutral state
        */}
        {activeEventType === EXT_EVENT_KUBECONFIG &&
          !errMessage &&
          kubeClusterAdded && (
            <InfoPanel>
              {strings.view.main.kubeConfigEvent.clusterAdded(eventClusterName)}
            </InfoPanel>
          )}
        {activeEventType === EXT_EVENT_KUBECONFIG &&
          !errMessage &&
          !kubeClusterAdded && (
            <InfoPanel>
              {strings.view.main.kubeConfigEvent.clusterSkipped(
                eventClusterName
              )}
            </InfoPanel>
          )}

        {/*
          when handling the EXT_EVENT_ACTIVATE_CLUSTER event, show the result in the UI even though
           user won't see it since we activate the cluster; just in case, as a neutral state
        */}
        {activeEventType === EXT_EVENT_ACTIVATE_CLUSTER && !errMessage && (
          <InfoPanel>
            {strings.view.main.activateClusterEvent.clusterActivated(
              eventClusterName
            )}
          </InfoPanel>
        )}

        {/* ClusterList and AddClusters apply only if NOT loading a kubeConfig */}
        {activeEventType !== EXT_EVENT_KUBECONFIG &&
        !errMessage &&
        authAccess.isValid(!activeEventType) &&
        clustersLoaded &&
        selectedClusters ? (
          <>
            <ClusterList
              clusters={clusters}
              selectedClusters={selectedClusters}
              onSelection={handleClusterSelection}
              onSelectAll={handleClusterSelectAll}
            />
            <AddClusters
              clusters={selectedClusters}
              passwordRequired={activeEventType === EXT_EVENT_ADD_CLUSTERS}
              onAdd={handleClustersAdd}
            />
          </>
        ) : undefined}
      </MainColumn>

      <HelpColumn>
        <HelpContent
          dangerouslySetInnerHTML={{ __html: strings.view.help.html() }}
        />
        <PreferencesPanel />
      </HelpColumn>
    </Container>
  );
};
