import { useConfig } from '../store/ConfigProvider';
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
    // performing SSO auth
    ssoAuthLoading ||
    // since we always auto-load clusters once auth is done, fill a potential
    //  gap that would flash loading state `true > false > true` between end
    //  of auth load and beginning of cluster load
    (ssoAuthLoaded && !ssoAuthError && !clusterDataLoaded) ||
    // loading list of clusters
    clusterDataLoading ||
    // performing an action like adding clusters or activating a cluster
    clusterActionsLoading
  );
};
