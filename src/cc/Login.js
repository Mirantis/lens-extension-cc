import { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { Component } from '@k8slens/extensions';
import { layout } from './styles';
import { Section } from './Section';
import { useExtState } from './store/ExtStateProvider';
import { useConfig } from './store/ConfigProvider';
import { useSsoAuth } from './store/SsoAuthProvider';
import { useClusterData } from './store/ClusterDataProvider';
import { useClusterLoadingState } from './hooks/useClusterLoadingState';
import { InlineNotice } from './InlineNotice';
import { normalizeUrl } from './netUtil';
import * as strings from '../strings';

const { Notifications } = Component;

const urlClassName = 'lecc-Login--url';

const Field = styled.div(function () {
  return {
    display: 'flex',
    alignItems: 'center',
    marginBottom: layout.gap,

    ':last-child': {
      marginBottom: 0,
    },

    [`div.Input.${urlClassName}`]: {
      flex: 1,
    },

    '> label': {
      minWidth: layout.grid * 23,
      marginRight: `${layout.pad}px`,
    },
  };
});

export const Login = function () {
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
    actions: configActions,
  } = useConfig();

  const {
    state: { loading: ssoAuthLoading },
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

  // NOTE: while this does include the individual flags above, it may include
  //  others we don't need to know details about here, but still need to be
  //  responsive to
  const loading = useClusterLoadingState();

  const [url, setUrl] = useState(cloudUrl || '');
  const [refreshing, setRefreshing] = useState(false); // if we're just reloading clusters

  // {boolean} true if user has clicked the Access button; false otherwise
  const [connectClicked, setConnectClicked] = useState(false);

  const usesSso = !!config?.keycloakLogin;

  //
  // EVENTS
  //

  const startLogin = useCallback(
    function () {
      authAccess.resetCredentials();
      authAccess.resetTokens();
      authAccess.usesSso = usesSso;

      // capture changes to auth details so far, and trigger SSO login in
      //  useClusterLoader() effect (because this will result in an updated authAccess
      //  object that has the right configuration per updates above)
      extActions.setAuthAccess(authAccess);
    },
    [authAccess, extActions, usesSso]
  );

  // returns true if refresh is possible and has started; false otherwise
  const tryRefresh = function () {
    if (
      clusterDataLoaded &&
      !clusterDataError &&
      url === cloudUrl &&
      authAccess.isValid() &&
      authAccess.usesSso
    ) {
      // just do a cluster data refresh instead of going through auth again
      setRefreshing(true);
      clusterDataActions.load({ cloudUrl, config, authAccess });
      return true;
    }

    return false;
  };

  const handleUrlChange = function (value) {
    setUrl(value);
  };

  const handleConnectClick = function () {
    if (!tryRefresh()) {
      const normUrl = normalizeUrl(url);
      setUrl(normUrl); // update to actual URL we'll use
      setConnectClicked(true);

      ssoAuthActions.reset();
      clusterDataActions.reset();

      // we're accessing a different instance, so nothing we may have already will
      //  work there
      authAccess.resetCredentials();
      authAccess.resetTokens();
      extActions.setAuthAccess(authAccess);

      // save URL as `cloudUrl` in preferences since the user claims it's valid
      extActions.setCloudUrl(normUrl);

      // NOTE: if the config loads successfully and we see that the instance is
      //  set for SSO auth, our effect() below that checks for `configLoaded`
      //  will auto-trigger onLogin(), which will then trigger SSO auth
      configActions.load(normUrl); // implicit reset of current config, if any
    }
  };

  const handleSsoCancelClick = function () {
    ssoAuthActions.cancel();
    setConnectClicked(false);
  };

  //
  // EFFECTS
  //

  useEffect(
    function () {
      if (refreshing && !clusterDataLoading && clusterDataLoaded) {
        setRefreshing(false);
      }
    },
    [refreshing, clusterDataLoading, clusterDataLoaded]
  );

  // on load, if we already have an instance URL but haven't yet loaded the config,
  //  load it immediately so we can know right away if it supports SSO or not, and
  //  save some time when the user clicks Connect
  useEffect(
    function () {
      if (cloudUrl && !configLoading && !configLoaded) {
        configActions.load(cloudUrl);
      }
    },
    [cloudUrl, configLoading, configLoaded, configActions]
  );

  useEffect(
    function () {
      if (configLoaded && !configError && connectClicked) {
        setConnectClicked(false);

        // start the SSO login process if the instance uses SSO since the user has
        //  clicked on the Connect button indicating intent to take action
        if (usesSso) {
          startLogin();
        } else {
          Notifications.error(
            `${strings.login.error.basicAuth()} ${strings.noteOwner}`
          );
        }
      }
    },
    [
      configLoaded,
      configError,
      config,
      url,
      extActions,
      startLogin,
      connectClicked,
      usesSso,
    ]
  );

  //
  // RENDER
  //

  return (
    <Section className="lecc-Login">
      <h3>{strings.login.title()}</h3>
      <Field>
        <label htmlFor="lecc-login-url">{strings.login.url.label()}</label>
        <Component.Input
          type="text"
          className={urlClassName}
          theme="round-black" // borders on all sides, rounded corners
          id="lecc-login-url"
          disabled={loading}
          value={url}
          onChange={handleUrlChange}
        />
      </Field>
      <div>
        <Component.Button
          primary
          disabled={loading}
          label={
            refreshing ||
            (url === cloudUrl && clusterDataLoaded && !clusterDataError)
              ? strings.login.action.refresh()
              : strings.login.action.connect()
          }
          waiting={configLoading || ssoAuthLoading || refreshing}
          onClick={handleConnectClick}
        />
      </div>
      {ssoAuthLoading && (
        <>
          <InlineNotice>
            <p
              dangerouslySetInnerHTML={{
                __html: strings.login.sso.messageHtml(),
              }}
            />
          </InlineNotice>
          <div>
            <Component.Button
              primary
              label={strings.login.action.ssoCancel()}
              onClick={handleSsoCancelClick}
            />
          </div>
        </>
      )}
    </Section>
  );
};
