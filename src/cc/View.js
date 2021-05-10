import { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import * as rtv from 'rtvjs';
import { Component } from '@k8slens/extensions';
import { useExtState } from './store/ExtStateProvider';
import { useConfig } from './store/ConfigProvider';
import { useSsoAuth } from './store/SsoAuthProvider';
import { useClusterData } from './store/ClusterDataProvider';
import {
  useClusterActions,
  SSO_STATE_ADD_CLUSTERS,
} from './store/ClusterActionsProvider';
import { useClusterLoader } from './hooks/useClusterLoader';
import { useClusterLoadingState } from './hooks/useClusterLoadingState';
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
  EXT_EVENT_OAUTH_CODE,
  extEventActivateClusterTs,
  extEventAddClustersTs,
  extEventKubeconfigTs,
  extEventOauthCodeTs,
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
      // TRACKING: https://github.com/Mirantis/lens-extension-cc/issues/27
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
    state: {
      authAccess,
      prefs: { cloudUrl, addToNew, offline, savePath },
    },
    actions: extActions,
  } = useExtState();

  const {
    state: { error: configError, config },
    actions: configActions,
  } = useConfig();

  const {
    state: { loading: ssoAuthLoading, error: ssoAuthError },
    actions: ssoAuthActions,
  } = useSsoAuth();

  const {
    state: {
      loading: clusterDataLoading,
      loaded: clusterDataLoaded,
      error: clusterDataError,
      data: { clusters },
    },
    actions: clusterDataActions,
  } = useClusterData();

  const {
    state: {
      loading: clusterActionsLoading,
      error: clusterActionsError,
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

  // @type {string} error message if something basic goes wrong with an extension event
  const [extEventError, setExtEventError] = useState(null);

  // @type {Array<string>} if set, array of namespace IDs to which the cluster list
  //  should be restricted; otherwise, all clusters in all namespaces are considered
  const [onlyNamespaces, setOnlyNamespaces] = useState(null);

  const loading = useClusterLoadingState();

  // when using SSO, for now, we need to limit selection to add a single cluster
  //  because the UX, when generating multiple kubeConfigs (one per cluster being added),
  //  is very bad (and the code would be a mess)
  const singleClusterOnly = !!config?.keycloakLogin;

  // @type {string|null} in order of execution/precedence
  // NOTE: currently not displayed (providers post notifications instead), but
  //  still used as a flag to know if we're in an error state or not
  const errMessage =
    configError ||
    ssoAuthError ||
    clusterDataError ||
    clusterActionsError ||
    extEventError ||
    null;

  //
  // EVENTS
  //

  const handleClusterSelection = useCallback(
    function ({ cluster, selected }) {
      const idx = selectedClusters.indexOf(cluster);
      if (selected && idx < 0) {
        setSelectedClusters(
          singleClusterOnly ? [cluster] : selectedClusters.concat(cluster)
        );
      } else if (!selected && !singleClusterOnly && idx >= 0) {
        const newSelection = selectedClusters.concat();
        newSelection.splice(idx, 1);
        setSelectedClusters(newSelection);
      }
      // else, don't allow de-selection when a single selection is required
    },
    [selectedClusters, singleClusterOnly]
  );

  const handleClusterSelectAll = useCallback(
    function ({ selected }) {
      if (!singleClusterOnly) {
        // shallow-clone by filtering for ready clusters
        setSelectedClusters(selected ? clusters.filter((cl) => cl.ready) : []);
      }
    },
    [clusters, singleClusterOnly]
  );

  const handleClustersAdd = useCallback(
    function () {
      if (!clusterActionsLoading) {
        clusterActions.addClusters({
          clusters: selectedClusters,
          config,
          offline,
        });
      }
    },
    [offline, config, selectedClusters, clusterActionsLoading, clusterActions]
  );

  const handleCloseClick = useCallback(
    function () {
      if (activeEventType !== EXT_EVENT_ACTIVATE_CLUSTER) {
        // adding a new cluster or adding 'all' clusters requires new tokens
        //  in `authAccess` and a new `cloudUrl`, so we assume whatever cluster
        //  data we may have already loaded is now invalid because the credentials
        //  could be for a different user even if the `cloudUrl` is the same,
        //  so reset everything, bringing the View back to the login step
        configActions.reset();
        ssoAuthActions.reset();
        clusterDataActions.reset();
        setSelectedClusters([]);
      }
      // else, just activating a cluster doesn't require changes to `authAccess`
      //  or to the `config`, so reset View back to clusters if we have any

      clusterActions.reset();
      setActiveEventType(null);
      setExtEventError(null);
      setLoaderMessage(null);
      setEventClusterName(null);
      setOnlyNamespaces(null);
    },
    [
      activeEventType,
      configActions,
      ssoAuthActions,
      clusterDataActions,
      clusterActions,
    ]
  );

  // activate a single (pre-added/existing) cluster in Lens in any workspace
  const handleActivateClusterEvent = useCallback(
    function (event) {
      const results = rtv.check(
        { event },
        { event: extEventActivateClusterTs }
      );
      if (!results.valid) {
        setActiveEventType(EXT_EVENT_ACTIVATE_CLUSTER);
        setExtEventError(
          strings.view.main.activateClusterEvent.error.invalidEventData()
        );
        return;
      }

      const { data } = event;

      if (!clusterActionsLoading) {
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
    [clusterActionsLoading, clusterActions]
  );

  // find all clusters in one or all namespaces from a given MCC instance and
  //  list them so that the user can add some or all of them to Lens, but without
  //  having to first authenticate with the instance since they're already
  //  authenticated when coming from MCC
  const handleAddClustersEvent = useCallback(
    function (event) {
      const results = rtv.check({ event }, { event: extEventAddClustersTs });
      if (!results.valid) {
        setActiveEventType(EXT_EVENT_ADD_CLUSTERS);
        setExtEventError(
          strings.view.main.addClustersEvent.error.invalidEventData()
        );
        return;
      }

      const { data } = event;
      const url = normalizeUrl(data.cloudUrl);

      // NOTE: it's critical these local state variables be set BEFORE resetting
      //  the providers and updating the `authAccess` via `extActions.setAuthAccess()`
      //  to make sure that `onlyNamespaces` is set before the cluster data load
      //  takes place; otherwise, because of the way state updates are performed
      //  async in React, we'll have a race condition and the cluster data may
      //  load before `onlyNamespaces` gets set, and we'll end-up with the wrong
      //  list of clusters to show the user
      setActiveEventType(EXT_EVENT_ADD_CLUSTERS);
      setLoaderMessage(strings.view.main.loaders.addClustersHtml(url));
      setOnlyNamespaces(data.onlyNamespaces || null);

      extActions.setCloudUrl(url);
      configActions.load(url); // implicit reset of current config
      ssoAuthActions.reset();
      clusterDataActions.reset();

      // NOTE: even under SSO auth, since we're getting the user's tokens,
      //  we don't need to make an initial auth request; we can just go straight
      //  for the clusters; but we'll need to re-auth when we want to generate
      //  kubeConfigs for the clusters the user wants to add
      authAccess.reset();
      authAccess.username = data.username;
      authAccess.usesSso = true; // assumed/expected
      authAccess.updateTokens(data.tokens);
      extActions.setAuthAccess(authAccess); // authAccess should be valid since we have tokens
    },
    [authAccess, ssoAuthActions, extActions, clusterDataActions, configActions]
  );

  // add a single cluster given its kubeConfig
  const handleKubeconfigEvent = useCallback(
    function (event) {
      const results = rtv.check({ event }, { event: extEventKubeconfigTs });
      if (!results.valid) {
        setActiveEventType(EXT_EVENT_KUBECONFIG);
        setExtEventError(
          strings.view.main.kubeConfigEvent.error.invalidEventData()
        );
        return;
      }

      const { data } = event;

      // NOTE: we don't have to do any authentication in case since we're just
      //  receiving the already-generated kubeConfig and we just need to
      //  write it to disk and load it up in Lens
      if (!clusterActionsLoading) {
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
    [savePath, addToNew, clusterActionsLoading, clusterActions]
  );

  // SSO authorization redirect/callback
  const handleOauthCodeEvent = useCallback(
    function (event) {
      rtv.verify({ event }, { event: extEventOauthCodeTs });
      const { data: oAuth } = event;

      if (!oAuth.state && ssoAuthLoading) {
        ssoAuthActions.finishAuthorization({ oAuth, config, authAccess });
      } else if (
        oAuth.state === SSO_STATE_ADD_CLUSTERS &&
        clusterActionsLoading
      ) {
        clusterActions.ssoFinishAddClusters({
          clusters: selectedClusters,
          oAuth,
          savePath,
          cloudUrl,
          config,
          addToNew,
          offline,
        });
      }
      // else, ignore as this is unsolicited/unexpected
    },
    [
      ssoAuthLoading,
      ssoAuthActions,
      clusterActionsLoading,
      clusterActions,
      config,
      authAccess,
      addToNew,
      offline,
      savePath,
      cloudUrl,
      selectedClusters,
    ]
  );

  //
  // EFFECTS
  //

  // get the config > authenticate > load clusters
  useClusterLoader(activeEventType, onlyNamespaces);

  useEffect(
    function () {
      addExtEventHandler(
        EXT_EVENT_ACTIVATE_CLUSTER,
        handleActivateClusterEvent
      );
      addExtEventHandler(EXT_EVENT_ADD_CLUSTERS, handleAddClustersEvent);
      addExtEventHandler(EXT_EVENT_KUBECONFIG, handleKubeconfigEvent);
      addExtEventHandler(EXT_EVENT_OAUTH_CODE, handleOauthCodeEvent);

      return function () {
        removeExtEventHandler(
          EXT_EVENT_ACTIVATE_CLUSTER,
          handleActivateClusterEvent
        );
        removeExtEventHandler(EXT_EVENT_ADD_CLUSTERS, handleAddClustersEvent);
        removeExtEventHandler(EXT_EVENT_KUBECONFIG, handleKubeconfigEvent);
        removeExtEventHandler(EXT_EVENT_OAUTH_CODE, handleOauthCodeEvent);
      };
    },
    [
      handleActivateClusterEvent,
      handleAddClustersEvent,
      handleKubeconfigEvent,
      handleOauthCodeEvent,
    ]
  );

  // set initial selection after cluster load
  useEffect(
    function () {
      if (clusterDataLoading && selectedClusters) {
        // NOTE: we need to use null to fill a timing gap between `clusterDataLoaded`
        //  (when no longer loading) and setting the initial selection: using null
        //  tells us not to render the ClusterList and AddClusters panel
        setSelectedClusters(null); // clear selection because we're (re-)loading clusters
      } else if (clusterDataLoaded && !selectedClusters) {
        // set initial selection, skipping management clusters since they typically
        //  are of less importance, as well as clusters that aren't ready yet
        const candidateClusters = clusters.filter(
          (cl) => cl.ready && !cl.isManagementCluster
        );
        setSelectedClusters(
          singleClusterOnly
            ? // initialize the selection to first candidate only
              candidateClusters.slice(0, 1)
            : candidateClusters
        );
      } else if (
        clusterDataLoaded &&
        activeEventType === EXT_EVENT_ADD_CLUSTERS
      ) {
        setLoaderMessage(null); // don't show the loader again when user actually adds the clusters
      }
    },
    [
      clusterDataLoading,
      clusterDataLoaded,
      clusters,
      selectedClusters,
      activeEventType,
      singleClusterOnly,
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
        {!activeEventType && <Login />}

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
          !loading &&
          !errMessage &&
          kubeClusterAdded && (
            <InfoPanel>
              {strings.view.main.kubeConfigEvent.clusterAdded(eventClusterName)}
            </InfoPanel>
          )}
        {activeEventType === EXT_EVENT_KUBECONFIG &&
          !loading &&
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
        {activeEventType === EXT_EVENT_ACTIVATE_CLUSTER &&
          !loading &&
          !errMessage && (
            <InfoPanel>
              {strings.view.main.activateClusterEvent.clusterActivated(
                eventClusterName
              )}
            </InfoPanel>
          )}

        {/* ClusterList and AddClusters apply only if NOT loading a kubeConfig */}
        {(!activeEventType || activeEventType === EXT_EVENT_ADD_CLUSTERS) &&
        authAccess.isValid() &&
        clusterDataLoaded &&
        selectedClusters ? (
          <>
            <ClusterList
              clusters={clusters}
              onlyNamespaces={onlyNamespaces}
              selectedClusters={selectedClusters}
              singleSelectOnly={singleClusterOnly}
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

      <HelpColumn>
        <HelpContent
          dangerouslySetInnerHTML={{
            __html: strings.view.help.html(),
          }}
        />
        <PreferencesPanel />
      </HelpColumn>
    </Container>
  );
};
