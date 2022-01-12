import { useState } from 'react';
import { Renderer } from '@k8slens/extensions';
import { InlineNotice } from '../InlineNotice';
import styled from '@emotion/styled';
import { layout } from '../styles';
import { normalizeUrl } from '../../../util/netUtil';
import { connectionBlock } from '../../../strings';
import { cloudStore } from '../../../store/CloudStore';
import { Cloud, CONNECTION_STATUSES } from '../../../common/Cloud';

const {
  Component: { Input, Button, Notifications },
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
  const [clusterName, setClusterName] = useState('');
  const [loading, setLoading] = useState(false);
  const [clusterUrl, setClusterUrl] = useState('');

  const checkError = (cloud) => {
    if (cloud?.connectError) {
      Notifications.error(cloud.connectError);
    }
  };

  const handleConnectClick = async function () {
    const normUrl = normalizeUrl(clusterUrl.trim());
    setClusterUrl(normUrl); // update to actual URL we'll use
    setLoading(true);
    let newCloud = new Cloud();
    newCloud.cloudUrl = normUrl;
    newCloud.statusListener = (status) => {
      if (status === CONNECTION_STATUSES.CONNECTING) {
        setLoading(true);
      } else if (status === CONNECTION_STATUSES.CONNECTED) {
        newCloud.cleanStatusListener();
        cloudStore.clouds[normUrl] = newCloud.toJSON();
        setLoading(false);
      } else if (status === CONNECTION_STATUSES.DISCONNECTED) {
        checkError(newCloud);
        newCloud.cleanStatusListener();
        setLoading(false);
      }
    };
    await newCloud.connect();
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
          value={clusterUrl}
          onChange={setClusterUrl}
          disabled={loading}
        />
        <ButtonWrapper>
          <Button
            primary
            waiting={loading}
            label={connectionBlock.button.label()}
            onClick={handleConnectClick}
            disabled={loading || !clusterUrl.trim().length}
          />
        </ButtonWrapper>
      </Field>
      <div>
        {!cloudStore?.clouds?.[clusterUrl] && (
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
