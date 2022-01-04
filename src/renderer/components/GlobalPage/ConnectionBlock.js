import { useState } from 'react';
import { InlineNotice } from '../InlineNotice';
import { Renderer } from '@k8slens/extensions';
import styled from '@emotion/styled';
import { layout } from '../styles';
import { useClusterLoadingState } from '../../hooks/useClusterLoadingState';
import { normalizeUrl } from '../../../util/netUtil';
import { useConfig } from '../../store/ConfigProvider';
import { useSsoAuth } from '../../store/SsoAuthProvider';
import { useExtState } from '../../store/ExtStateProvider';
import { useClusterData } from '../../store/ClusterDataProvider';
import { connectionBlock } from '../../../strings';

const {
  Component: { Input, Button },
} = Renderer;

const Title = styled.h2(() => ({
  marginBottom: layout.gap * 3,
  marginRight: layout.gap,
}));

const MainContent = styled.div(() => ({
  marginTop: layout.gap * 3,
  maxWidth: '750px',
  width: '100%',
}));

const Field = styled.div(() => ({
  marginBottom: layout.gap,

  ':last-child': {
    marginBottom: 0,
  },

  '> label': {
    marginBottom: layout.pad,
    display: 'inline-block',
  },
}));
const ButtonWrapper = styled.div(() => ({
  marginTop: layout.gap,
}));

const ConnectionBlock = () => {
  const {
    state: { loading: configLoading },
    actions: configActions,
  } = useConfig();

  const {
    state: { loading: ssoAuthLoading, loaded: ssoAuthLoaded },
    actions: ssoAuthActions,
  } = useSsoAuth();
  const {
    state: { cloud },
    actions: extActions,
  } = useExtState();
  const { actions: clusterDataActions } = useClusterData();

  const [clusterName, setClusterName] = useState('');
  const [clusterURL, setClusterURL] = useState('');

  const loading = useClusterLoadingState();

  const handleConnectClick = function () {
    const normUrl = normalizeUrl(clusterURL.trim());
    setClusterURL(normUrl); // update to actual URL we'll use

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
    <MainContent>
      <Title>{connectionBlock.title()}</Title>
      <Field>
        <label htmlFor="lecc-cluster-name">
          {connectionBlock.clusterName.label()}
        </label>
        <Input
          type="text"
          theme="round-black" // borders on all sides, rounded corners
          placeholder={connectionBlock.clusterName.placeholder()}
          id="lecc-cluster-name"
          value={clusterName}
          onChange={setClusterName}
          disabled={loading}
        />
      </Field>
      <Field>
        <label htmlFor="lecc-cluster-url">
          {connectionBlock.clusterUrl.label()}
        </label>
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
            waiting={configLoading || ssoAuthLoading}
            label={connectionBlock.button.label()}
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
                __html: connectionBlock.notice.info(),
              }}
            />
          </InlineNotice>
        )}
      </div>
    </MainContent>
  );
};

export default ConnectionBlock;
