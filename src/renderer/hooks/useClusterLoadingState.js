import { useConfig } from '../store/ConfigProvider';
import { useSsoAuth } from '../store/SsoAuthProvider';
import { useClusterData } from '../store/ClusterDataProvider';
import { useClusterActions } from '../store/ClusterActionsProvider';

// TODO this hook need to be updated/removed when new components/logic will be added. Now this mostly an artifact
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
    state: { loading: ssoAuthLoading },
  } = useSsoAuth();

  const {
    state: { loading: clusterDataLoading },
  } = useClusterData();

  const {
    state: { loading: clusterActionsLoading },
  } = useClusterActions();

  return (
    // loading config for cloudUrl
    configLoading ||
    // performing SSO auth
    ssoAuthLoading ||
    // loading list of clusters
    clusterDataLoading ||
    // performing an action like adding clusters or activating a cluster
    clusterActionsLoading
  );
};
