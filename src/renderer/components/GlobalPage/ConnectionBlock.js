import { useCallback, useEffect, useState } from 'react';
import * as rtv from 'rtvjs';
import { InlineNotice } from '../InlineNotice';
import { Renderer } from '@k8slens/extensions';
import { cloneDeep } from 'lodash';
import styled from '@emotion/styled';
import { layout } from '../styles';
import { useClusterLoadingState } from '../../hooks/useClusterLoadingState';
import { normalizeUrl } from '../../../util/netUtil';
import { useSsoAuth } from '../../store/SsoAuthProvider';
import { connectionBlock } from '../../../strings';
import { cloudStore } from '../../../store/CloudStore';
import { Cloud } from '../../auth/Cloud';
import { EXT_EVENT_OAUTH_CODE } from '../../../constants';
import {
  addExtEventHandler,
  removeExtEventHandler,
  extEventOauthCodeTs,
} from '../../eventBus';
import * as ssoUtil from '../../../util/ssoUtil';

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

export const ConnectionBlock = () => {
  const {
    state: { loading: ssoAuthLoading, loaded: ssoAuthLoaded },
  } = useSsoAuth();
  const [config, setConfig] = useState(null);
  const [cloud, setCloud] = useState(null);
  const [clusterName, setClusterName] = useState('');
  const [clusterUrl, setClusterUrl] = useState('');

  // TODO currently this is not working. Need to be updated according to new logic
  const loading = useClusterLoadingState();

  // TODO here we need changes related to eventBus
  // Also open question if we have to use ssoAuthActions to show loaders, etc
  const handleOauthCodeEvent = useCallback(
    async function (event) {
      DEV_ENV && rtv.verify({ event }, { event: extEventOauthCodeTs });
      const { data: oAuth } = event;

      if (config && cloud) {
        await ssoUtil.finishAuthorization({ oAuth, config, cloud });
        // update value inside object
        cloudStore.clouds[clusterUrl] = cloneDeep(cloud);
      }
      // else, ignore as this is unsolicited/unexpected
    },
    [config, cloud, clusterUrl]
  );
  // TODO this logic should be updated to follow multiple oAuth events (update eventBus)
  useEffect(
    function () {
      addExtEventHandler(EXT_EVENT_OAUTH_CODE, handleOauthCodeEvent);

      return function () {
        removeExtEventHandler(EXT_EVENT_OAUTH_CODE, handleOauthCodeEvent);
      };
    },
    [handleOauthCodeEvent]
  );

  const handleConnectClick = async function () {
    const normUrl = normalizeUrl(clusterUrl.trim());
    setClusterUrl(normUrl); // update to actual URL we'll use
    let newCloud = new Cloud();
    cloudStore.clouds[normUrl] = newCloud; // update existing or add new cloud
    const conf = await newCloud.connect(normUrl);

    if (!conf) {
      delete cloudStore.clouds[normUrl];
    }
    setConfig(conf);
    setCloud(newCloud);
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
          disabled={loading} // currently this is not working. Need to be updated according to new logic
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
          value={clusterUrl}
          onChange={setClusterUrl}
          disabled={loading} // currently this is not working. Need to be updated according to new logic
        />
        <ButtonWrapper>
          <Button
            primary
            waiting={ssoAuthLoading} // currently this is not working. Need to be updated according to new logic
            label={connectionBlock.button.label()}
            onClick={handleConnectClick}
            disabled={loading} // currently this is not working. Need to be updated according to new logic
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
