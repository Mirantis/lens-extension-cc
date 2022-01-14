import { useEffect } from 'react';
import { useExtState } from '../store/ExtStateProvider';
import { useConfig } from '../store/ConfigProvider';
import { useSsoAuth } from '../store/SsoAuthProvider';
import { useClusterData } from '../store/ClusterDataProvider';
import { logger } from '../../util/logger';

/**
 * Custom hook that loads the MCC config, authenticates with the instance, and
 *  loads all available clusters.
 * @param {string} [activeEventType] If set, the type of extension event
 *  (from the `eventBus`) that is currently being handled; otherwise, the
 *  extension is assumed to be in its 'normal' state.
 * @param {string} [onlyNamespaces] If set, when cluster data is loaded, only
 *  clusters in these namespaces will be considered; otherwise, all clusters in
 *  all namespaces will be considered.
 */
export const useClusterLoader = function (
  activeEventType = null,
  onlyNamespaces = null
) {
  //
  // STATE
  //

  const {
    state: {
      cloud,
      prefs: { cloudUrl },
    },
  } = useExtState();

  const {
    state: {
      loading: configLoading,
      loaded: configLoaded,
      error: configError,
      config,
    },
  } = useConfig();

  const {
    state: {
      loading: ssoAuthLoading,
      loaded: ssoAuthLoaded,
      error: ssoAuthError,
    },
    actions: ssoAuthActions,
  } = useSsoAuth();

  const {
    state: {
      loading: clusterDataLoading,
      loaded: clusterDataLoaded,
      error: clusterDataError,
    },
    actions: clusterDataActions,
  } = useClusterData();

  //
  // EFFECTS
  //

  useEffect(
    function () {
      if (DEV_ENV) {
        logger.log(
          'hooks/useClusterLoader',
          `=== CONFIG configLoading=${configLoading}, configLoaded=${configLoaded}, configError=${
            configError ? `"${configError}"` : '<none>'
          }`,
          { config }
        );
      }
    },
    [config, configLoading, configLoaded, configError]
  );

  // 1. Authenticate with SSO auth IIF config says MCC instance IS SSO
  useEffect(
    function () {
      if (DEV_ENV) {
        logger.log(
          'hooks/useClusterLoader#ssoAuth',
          `=== config=${
            config ? '<set>' : '<none>'
          }, ssoAuthLoading=${ssoAuthLoading}, ssoAuthLoaded=${ssoAuthLoaded}, ssoAuthError=${
            ssoAuthError ? `"${ssoAuthError}"` : '<none>'
          }, activeEventType=${activeEventType}, cloud.isValid()=${cloud.isValid()}`,
          { cloudUrl, config, cloud, ssoAuthLoading, ssoAuthLoaded }
        );
      }

      if (
        cloudUrl && // MCC instance is known
        config && // config loaded
        config.keycloakLogin && // WITH SSO gates this effect
        !ssoAuthLoading &&
        !ssoAuthLoaded
      ) {
        if (cloud.isValid()) {
          // skip authentication, go straight for the clusters
          DEV_ENV &&
            logger.log(
              'hooks/useClusterLoader#ssoAuth',
              '====== SSO skipped: authorized'
            );
          ssoAuthActions.setAuthorized();
        } else {
          DEV_ENV &&
            logger.log(
              'hooks/useClusterLoader#ssoAuth',
              '====== starting authentication...'
            );
          ssoAuthActions.startAuthorization({ config });
        }
      } else if (DEV_ENV) {
        logger.log(
          'hooks/useClusterLoader#ssoAuth',
          '====== not authenticating'
        );
      }
    },
    [
      ssoAuthLoading,
      ssoAuthLoaded,
      ssoAuthError,
      ssoAuthActions,
      cloud,
      cloudUrl,
      config,
      activeEventType,
    ]
  );

  // 2. get cluster data (ie. the list of clusters available to the user)
  useEffect(
    function () {
      if (DEV_ENV) {
        logger.log(
          'hooks/useClusterLoader#getClusterData',
          `=== config=${
            config ? '<set>' : '<none>'
          }, cloud.isValid()=${cloud.isValid()}, clusterDataLoading=${clusterDataLoading}, clusterDataLoaded=${clusterDataLoaded}, clusterDataError=${
            clusterDataError ? `"${clusterDataError}"` : '<none>'
          }, onlyNamespaces=${onlyNamespaces?.join(',')}`,
          {
            cloudUrl,
            config,
            ssoAuthLoaded,
            cloud,
            clusterDataLoading,
            clusterDataLoaded,
          }
        );
      }

      if (
        cloudUrl && // MCC instance is known
        config && // config loaded
        ssoAuthLoaded && // must be authenticated at this point
        cloud.isValid() && // must have valid tokens (they may have expired)
        !clusterDataLoading &&
        !clusterDataLoaded
      ) {
        DEV_ENV &&
          logger.log(
            'hooks/useClusterLoader#getClusterData',
            '====== fetching...'
          );
        clusterDataActions.load({
          cloudUrl,
          config,
          cloud,
          onlyNamespaces,
        });
      } else if (DEV_ENV) {
        logger.log('hooks/useClusterLoader#getClusterData', '====== no fetch');
      }
    },
    [
      cloudUrl,
      cloud,
      config,
      ssoAuthLoaded,
      clusterDataLoading,
      clusterDataLoaded,
      clusterDataError,
      clusterDataActions,
      activeEventType,
      onlyNamespaces,
    ]
  );
};
