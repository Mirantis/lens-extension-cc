import { useCallback, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';
import * as strings from '../../../strings';
import { normalizeUrl } from '../../../util/netUtil';
import { InlineNotice } from '../InlineNotice';
import { useExtState } from '../../store/ExtStateProvider';
import { useConfig } from '../../store/ConfigProvider';
import { useSsoAuth } from '../../store/SsoAuthProvider';
import { useClusterData } from '../../store/ClusterDataProvider';
import { useClusterLoadingState } from '../../hooks/useClusterLoadingState';

const {
  Component: { Input, Button },
} = Renderer;

const Title = styled.div(function () {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',

    h2: {
      marginBottom: layout.gap * 3,
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
    backgroundColor: 'var(--contentColor)',
    display: 'flex',
    justifyContent: 'space-between',
  };
});
const EscColumn = styled.div(function () {
  return {
    marginTop: layout.gap,
    padding: layout.gap,
    width: '50px',
    flexShrink: 1,
  };
});

const MainColumn = styled.div(function () {
  return {
    display: 'flex',
    flex: 1,
    justifyContent: 'center',
  };
});
const MainContent = styled.div(function () {
  return {
    marginTop: layout.gap * 3,
    padding: layout.gap,
    maxWidth: '750px',
  };
});

const Field = styled.div(function () {
  return {
    marginBottom: layout.gap,

    ':last-child': {
      marginBottom: 0,
    },

    '> label': {
      marginBottom: layout.pad,
      display: 'inline-block',
    },
  };
});
const ButtonWrapper = styled.div(() => ({
  marginTop: layout.gap,
}));

const AddCloudInstance = () => {
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
    state: { loading: ssoAuthLoading, loaded: ssoAuthLoaded },
    actions: ssoAuthActions,
  } = useSsoAuth();
  const {
    state: {
      cloud,
      prefs: { cloudUrl },
    },
    actions: extActions,
  } = useExtState();
  const { actions: clusterDataActions } = useClusterData();

  const [clusterName, setClusterName] = useState('');
  const [clusterURL, setClusterURL] = useState(cloudUrl || '');
  // {boolean} true if user has clicked the Access button; false otherwise
  const [connectClicked, setConnectClicked] = useState(false);

  const loading = useClusterLoadingState();

  const startLogin = useCallback(
    function () {
      cloud.resetCredentials();
      cloud.resetTokens();

      // capture changes to auth details so far, and trigger SSO login in
      //  useClusterLoader() effect (because this will result in an updated cloud
      //  object that has the right configuration per updates above)
      extActions.setCloud(cloud);
    },
    [cloud, extActions]
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
      if (configError) {
        setConnectClicked(false);
      }
      if (configLoaded && !configError && connectClicked) {
        setConnectClicked(false);
        startLogin();
      }
    },
    [
      configLoaded,
      configError,
      config,
      cloudUrl,
      extActions,
      startLogin,
      connectClicked,
    ]
  );

  const handleConnectClick = function () {
    const normUrl = normalizeUrl(clusterURL);
    setClusterURL(normUrl); // update to actual URL we'll use
    setConnectClicked(true);

    ssoAuthActions.reset();
    clusterDataActions.reset();

    // we're accessing a different instance, so nothing we may have already will
    //  work there
    cloud.resetCredentials();
    cloud.resetTokens();
    extActions.setCloud(cloud);

    // save URL as `cloudUrl` in preferences since the user claims it's valid
    extActions.setCloudUrl(normUrl);

    // NOTE: if the config loads successfully and we see that the instance is
    //  set for SSO auth, our effect() below that checks for `configLoaded`
    //  will auto-trigger onLogin(), which will then trigger SSO auth
    configActions.load(normUrl); // implicit reset of current config, if any
  };

  return (
    <PageContainer>
      <MainColumn>
        <MainContent>
          <Title>
            <h2>Add a Mirantis Container Cloud Management Custer to Lens</h2>
          </Title>
          <Field>
            <label htmlFor="lecc-cluster-name">Management Cluster name:</label>
            <Input
              type="text"
              theme="round-black" // borders on all sides, rounded corners
              placeholder="This name will be used to identify your Management Cluster in Lens"
              id="lecc-cluster-name"
              value={clusterName}
              onChange={setClusterName}
              disabled={loading}
            />
          </Field>
          <Field>
            <label htmlFor="lecc-cluster-url">Management Cluster URL:</label>
            <Input
              type="text"
              theme="round-black" // borders on all sides, rounded corners
              id="lecc-cluster-url"
              value={clusterURL}
              onChange={setClusterURL}
              disabled={loading}
            />
            <ButtonWrapper>
              <Button
                primary
                waiting={configLoading || ssoAuthLoading || connectClicked}
                label={strings.login.action.connect()}
                onClick={handleConnectClick}
                disabled={loading}
              />
            </ButtonWrapper>
          </Field>
          <div>
            {!ssoAuthLoaded && (
              <InlineNotice>
                <p
                  dangerouslySetInnerHTML={{
                    __html:
                      "You will be directed to your Management Cluster's login page through your web browser where you should enter your SSO credentials ",
                  }}
                />
              </InlineNotice>
            )}
          </div>
        </MainContent>
      </MainColumn>
      <EscColumn>Esc</EscColumn>
    </PageContainer>
  );
};

export default AddCloudInstance;
