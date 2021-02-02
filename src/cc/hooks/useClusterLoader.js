import { useEffect } from 'react';
import { useExtState } from '../store/ExtStateProvider';
import { useConfig } from '../store/ConfigProvider';
import { useBasicAuth } from '../store/BasicAuthProvider';
import { useSsoAuth } from '../store/SsoAuthProvider';
import { useClusterData } from '../store/ClusterDataProvider';
import { logger } from '../../util';

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
      authAccess,
      prefs: { cloudUrl },
    },
    actions: extActions,
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
      loading: basicAuthLoading,
      loaded: basicAuthLoaded,
      error: basicAuthError,
    },
    actions: basicAuthActions,
  } = useBasicAuth();

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
      if (authAccess.changed) {
        // capture any changes after authenticating (steps 1a or 1b) or loading clusters
        extActions.setAuthAccess(authAccess);
      }
    },
    [authAccess, extActions]
  );

  useEffect(
    function () {
      if (DEV_ENV) {
        logger.log(
          'hooks/useClusterLoader',
          `=== CONFIG configLoading=${configLoading}, configLoaded=${configLoaded}, configError=${
            configError ? `"${configError}"` : '<none>'
          }`
        );
      }
    },
    [configLoading, configLoaded, configError]
  );

  // 1a. Authenticate with BASIC auth IIF config says MCC instance NOT SSO
  useEffect(
    function () {
      if (
        cloudUrl && // MCC instance is known
        config && // config loaded
        !config.keycloakLogin && // NOT SSO gates this effect
        !authAccess.usesSso && // auth access is for basic auth
        !basicAuthLoading &&
        !basicAuthLoaded
      ) {
        if (authAccess.isValid(!activeEventType)) {
          // skip authentication, go straight for the clusters
          basicAuthActions.setAuthenticated();
        } else if (authAccess.hasCredentials()) {
          basicAuthActions.authenticate({
            authAccess,
            cloudUrl,
            config,
          });
        }
        // else, STOP and let the Login view get the username and password needed
      } else if (DEV_ENV) {
        logger.log(
          'hooks/useClusterLoader',
          `=== NOT doing BASIC auth, basicAuthLoading=${basicAuthLoading}, basicAuthLoaded=${basicAuthLoaded}, basicAuthError=${
            basicAuthError ? `"${basicAuthError}"` : '<none>'
          }, activeEventType=${activeEventType}, authAccess.isValid()=${authAccess.isValid(
            !activeEventType
          )}`
        );
      }
    },
    [
      basicAuthLoading,
      basicAuthLoaded,
      basicAuthError,
      basicAuthActions,
      authAccess,
      cloudUrl,
      config,
      activeEventType,
    ]
  );

  // 1b. Authenticate with SSO auth IIF config says MCC instance IS SSO
  useEffect(
    function () {
      if (
        cloudUrl && // MCC instance is known
        config && // config loaded
        config.keycloakLogin && // WITH SSO gates this effect
        authAccess.usesSso && // auth access is for SSO auth
        !ssoAuthLoading &&
        !ssoAuthLoaded
      ) {
        if (authAccess.isValid(!activeEventType)) {
          // skip authentication, go straight for the clusters
          ssoAuthActions.setAuthorized();
        } else {
          ssoAuthActions.startAuthorization({ config });
        }
      } else if (DEV_ENV) {
        logger.log(
          'hooks/useClusterLoader',
          `=== NOT doing SSO auth, ssoAuthLoading=${ssoAuthLoading}, ssoAuthLoaded=${ssoAuthLoaded}, ssoAuthError=${
            ssoAuthError ? `"${ssoAuthError}"` : '<none>'
          }, activeEventType=${activeEventType}, authAccess.isValid()=${authAccess.isValid(
            !activeEventType
          )}`
        );
      }
    },
    [
      ssoAuthLoading,
      ssoAuthLoaded,
      ssoAuthError,
      ssoAuthActions,
      authAccess,
      cloudUrl,
      config,
      activeEventType,
    ]
  );

  // 2. get cluster data (ie. the list of clusters available to the user)
  useEffect(
    function () {
      if (
        cloudUrl && // MCC instance is known
        config && // config loaded
        (basicAuthLoaded || ssoAuthLoaded) && // must be authenticated at this point
        authAccess.isValid(!activeEventType) && // must have valid tokens (they may have expired)
        !clusterDataLoading &&
        !clusterDataLoaded
      ) {
        clusterDataActions.load({
          cloudUrl,
          config,
          authAccess,
          onlyNamespaces,
        });
      } else if (DEV_ENV) {
        logger.log(
          'hooks/useClusterLoader',
          `=== NOT loading cluster data, clusterDataLoading=${clusterDataLoading}, clusterDataLoaded=${clusterDataLoaded}, clusterDataError=${
            clusterDataError ? `"${clusterDataError}"` : '<none>'
          }, onlyNamespaces=${onlyNamespaces?.join(',')}`
        );
      }
    },
    [
      cloudUrl,
      authAccess,
      config,
      basicAuthLoaded,
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
