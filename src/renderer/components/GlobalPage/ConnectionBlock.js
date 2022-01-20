import { useState } from 'react';
import PropTypes from 'prop-types';
import { Renderer } from '@k8slens/extensions';
import { InlineNotice } from '../InlineNotice';
import styled from '@emotion/styled';
import { layout } from '../styles';
import { normalizeUrl } from '../../../util/netUtil';
import { connectionBlock } from '../../../strings';
import { cloudStore } from '../../../store/CloudStore';
import {
  Cloud,
  CONNECTION_STATUSES,
  CLOUD_EVENTS,
} from '../../../common/Cloud';

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

export const ConnectionBlock = ({
  setCloud,
  extCloudLoading,
  cleanCloudsState,
}) => {
  const [clusterName, setClusterName] = useState('');
  const [loading, setLoading] = useState(false);
  const [clusterUrl, setClusterUrl] = useState('');

  const checkError = (cloud) => {
    if (cloud?.connectError) {
      Notifications.error(cloud.connectError);
    }
  };

  const handleConnectClick = async function () {
    cleanCloudsState();
    const normUrl = normalizeUrl(clusterUrl.trim());
    setClusterUrl(normUrl); // update to actual URL we'll use
    setLoading(true);
    let newCloud = new Cloud();
    newCloud.cloudUrl = normUrl;
    newCloud.name = clusterName;
    const statusListener = () => {
      if (newCloud.status === CONNECTION_STATUSES.CONNECTING) {
        setLoading(true);
      } else {
        setLoading(false);
        newCloud.removeEventListener(
          CLOUD_EVENTS.STATUS_CHANGE,
          statusListener
        );
        if (newCloud.status === CONNECTION_STATUSES.CONNECTED) {
          // we haven't store cloud in CloudStore on this level. It should be done at SynchronizeBlock
          // cloudStore.clouds[normUrl] = newCloud;
          setCloud(newCloud);
        } else {
          checkError(newCloud);
        }
      }
    };
    newCloud.addEventListener(CLOUD_EVENTS.STATUS_CHANGE, statusListener);
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
          disabled={loading || extCloudLoading}
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
          disabled={loading || extCloudLoading}
        />
        <ButtonWrapper>
          <Button
            primary
            waiting={loading || extCloudLoading}
            label={connectionBlock.button.label()}
            onClick={handleConnectClick}
            disabled={loading || extCloudLoading || !clusterUrl.trim().length}
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

ConnectionBlock.propTypes = {
  setCloud: PropTypes.func.isRequired,
  extCloudLoading: PropTypes.bool.isRequired,
  cleanCloudsState: PropTypes.func.isRequired,
};
