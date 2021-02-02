import { useConfig } from '../store/ConfigProvider';
import { useBasicAuth } from '../store/BasicAuthProvider';
import { useSsoAuth } from '../store/SsoAuthProvider';
import { useClusterData } from '../store/ClusterDataProvider';
import { useClusterActions } from '../store/ClusterActionsProvider';

/**
 * Custom hook that determines the current loading state for all things related
 *  to clusters.
 * @returns {boolean} True if at least one cluster-related provider is loading data;
 *  false otherwise.
 */
export const useClusterLoadingState = function () {
  //
  // STATE
  //

  const {
    state: { loading: configLoading },
  } = useConfig();

  const {
    state: {
      loading: basicAuthLoading,
      loaded: basicAuthLoaded,
      error: basicAuthError,
    },
  } = useBasicAuth();

  const {
    state: {
      loading: ssoAuthLoading,
      loaded: ssoAuthLoaded,
      error: ssoAuthError,
    },
  } = useSsoAuth();

  const {
    state: { loading: clusterDataLoading, loaded: clusterDataLoaded },
  } = useClusterData();

  const {
    state: { loading: clusterActionsLoading },
  } = useClusterActions();

  return (
    // loading config for cloudUrl
    configLoading ||
    // performing basic auth
    basicAuthLoading ||
    // since we always auto-load clusters once auth is done, fill a potential
    //  gap that would flash loading state `true > false > true` between end
    //  of auth load and beginning if cluster load
    (basicAuthLoaded && !basicAuthError && !clusterDataLoaded) ||
    // performing SSO auth
    ssoAuthLoading ||
    // fill the same auth > clusters gap as in basic auth case above
    (ssoAuthLoaded && !ssoAuthError && !clusterDataLoaded) ||
    // loading list of clusters
    clusterDataLoading ||
    // performing an action like adding clusters or activating a cluster
    clusterActionsLoading
  );
};
