//
// Main view for the GlobalPage
//

import { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import * as rtv from 'rtvjs';
import { Renderer } from '@k8slens/extensions';
import { useExtState } from '../../store/ExtStateProvider';
import { useConfig } from '../../store/ConfigProvider';
import { useSsoAuth } from '../../store/SsoAuthProvider';
import { useClusterData } from '../../store/ClusterDataProvider';
import {
  useClusterActions,
  SSO_STATE_ADD_CLUSTERS,
} from '../../store/ClusterActionsProvider';
import { useClusterLoader } from '../../hooks/useClusterLoader';
import { useClusterLoadingState } from '../../hooks/useClusterLoadingState';
import { Login } from './Login';
import { ClusterList } from './ClusterList';
import { AddClusters } from './AddClusters';
import { Loader } from '../Loader';
import { ErrorPanel } from '../ErrorPanel';
import { PreferencesPanel } from './PreferencesPanel';
import * as strings from '../../../strings';
import { catalog as catalogConsts } from '../../../constants';
import { layout, mixinColumnStyles, mixinPageStyles } from '../styles';
import {
  EXT_EVENT_OAUTH_CODE,
  extEventOauthCodeTs,
  addExtEventHandler,
  removeExtEventHandler,
} from '../../eventBus';
import { getLensClusters } from '../../rendererUtil';
import { AddCloudInstance } from './AddCloudInstance.js';

const { Component } = Renderer;

//
// INTERNAL STYLED COMPONENTS
//

const MainColumn = styled.div(function () {
  return {
    ...mixinColumnStyles(),
  };
});

const HelpColumn = styled.div(function () {
  return {
    ...mixinColumnStyles(),
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

const PageContainer = styled.div(function () {
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    ...mixinPageStyles(),
  };
});

//
// MAIN COMPONENT
//

export const SyncView = function () {
  //
  // STATE
  //

  const {
    state: {
      cloud,
      prefs: { cloudUrl, offline, savePath },
    },
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
    state: { loading: clusterActionsLoading, error: clusterActionsError },
    actions: clusterActions,
  } = useClusterActions();

  const [showNewDesign, setShowNewDesign] = useState(false);

  // @type {null|Array<Cluster>} null until clusters are loaded, then an array
  //  that represents the current selection, could be empty
  const [selectedClusters, setSelectedClusters] = useState(null);

  // @type {string|null} if set, the type of extension event (from the `eventBus`) that
  //  is currently being handled; otherwise, the extension is in its 'normal' state
  const [activeEventType, setActiveEventType] = useState(null);

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
      // adding a new cluster or adding 'all' clusters requires new tokens
      //  in `cloud` and a new `cloudUrl`, so we assume whatever cluster
      //  data we may have already loaded is now invalid because the credentials
      //  could be for a different user even if the `cloudUrl` is the same,
      //  so reset everything, bringing the View back to the login step
      configActions.reset();
      ssoAuthActions.reset();
      clusterDataActions.reset();
      setSelectedClusters([]);
      // else, just activating a cluster doesn't require changes to `cloud`
      //  or to the `config`, so reset View back to clusters if we have any

      clusterActions.reset();
      setActiveEventType(null);
      setExtEventError(null);
      setLoaderMessage(null);
      setOnlyNamespaces(null);
    },
    [configActions, ssoAuthActions, clusterDataActions, clusterActions]
  );

  // SSO authorization redirect/callback
  const handleOauthCodeEvent = useCallback(
    function (event) {
      DEV_ENV && rtv.verify({ event }, { event: extEventOauthCodeTs });
      const { data: oAuth } = event;

      if (!oAuth.state && ssoAuthLoading) {
        ssoAuthActions.finishAuthorization({ oAuth, config, cloud });
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
      cloud,
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
      addExtEventHandler(EXT_EVENT_OAUTH_CODE, handleOauthCodeEvent);

      return function () {
        removeExtEventHandler(EXT_EVENT_OAUTH_CODE, handleOauthCodeEvent);
      };
    },
    [handleOauthCodeEvent]
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
        const lensClusters = getLensClusters();
        // set initial selection, skipping management clusters since they typically
        //  are of less importance, as well as clusters that aren't ready yet,
        //  and clusters that are already in Lens
        const candidateClusters = clusters.filter(
          (cl) =>
            cl.ready &&
            !cl.isManagementCluster &&
            cl.namespace !== 'default' &&
            !lensClusters.find((lc) => lc.metadata.uid === cl.id)
        );
        setSelectedClusters(
          singleClusterOnly
            ? // initialize the selection to first candidate only
              candidateClusters.slice(0, 1) // slice of any array will always return an array, may empty
            : candidateClusters
        );
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
  const onShowNewDesign = (e) => {
    if (e.shiftKey) {
      setShowNewDesign(true);
    }
  };

  const title = strings.syncView.main.titles.generic();

  // TODO way to go on New Design shift+click on title
  if (showNewDesign) {
    return <AddCloudInstance onCancel={() => setShowNewDesign(false)} />;
  }

  return (
    <PageContainer>
      <MainColumn>
        {/* include X (close) only if we're handling an extension event */}
        <Title>
          <h2 onClick={onShowNewDesign}>{title}</h2>
          {activeEventType && (
            <Component.Icon
              material="close"
              interactive
              big
              title={strings.syncView.main.close()}
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

        {/* ClusterList and AddClusters apply only if NOT loading a kubeConfig */}
        {!activeEventType &&
        cloud.isValid() &&
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
            __html: strings.syncView.help.html({
              catalogSource: catalogConsts.source,
              srcLabelName: catalogConsts.labels.source,
              nsLabelName: catalogConsts.labels.namespace,
            }),
          }}
        />
        <PreferencesPanel />
      </HelpColumn>
    </PageContainer>
  );
};
