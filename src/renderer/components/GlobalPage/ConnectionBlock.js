import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Renderer } from '@k8slens/extensions';
import { InlineNotice } from '../InlineNotice';
// TODO[trustHost]: import { InlineNotice, types as noticeTypes } from '../InlineNotice';
import styled from '@emotion/styled';
import { layout } from '../styles';
import { normalizeUrl } from '../../../util/netUtil';
import { connectionBlock } from '../../../strings';
import { useClouds } from '../../store/CloudProvider';
import { RequiredMark } from '../RequiredMark';
import {
  checkValues,
  TriStateCheckbox,
} from '../TriStateCheckbox/TriStateCheckbox';

const {
  Component: { Input, Button },
} = Renderer;

const Title = styled.h2(() => ({
  marginBottom: layout.gap * 3,
  marginRight: layout.gap,
}));

const MainContent = styled.form(() => ({
  marginTop: layout.gap * 3,
  maxWidth: '750px',
  width: '100%',

  '.trust-host-warning': {
    marginTop: layout.pad,
  },

  '.connection-notice-info': {
    marginTop: layout.gap,
  },
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

const mkCloudAlreadySyncedValidator = (clouds) => ({
  message: () => connectionBlock.notice.urlAlreadyUsed(),
  validate: (url) => !clouds[normalizeUrl(url)],
});

const nameSymbols = {
  message: () => connectionBlock.notice.nameSymbolsAreNotValid(),
  validate: (name) => /^[a-zA-Z0-9_-]*$/.test(name),
};

const mkNameValidator = (clouds) => ({
  message: () => connectionBlock.notice.nameAlreadyUsed(),
  validate: (value) =>
    !Object.values(clouds).find(({ name }) => name === value),
});

const getOriginUrl = (url) => {
  try {
    return new URL(url).origin;
  } catch (e) {
    return url;
  }
};

export const ConnectionBlock = ({ loading, onClusterConnect }) => {
  //
  // STATE
  //

  const { clouds } = useClouds();
  const [clusterName, setClusterName] = useState('');
  const [clusterUrl, setClusterUrl] = useState('');
  const [showInfoBox, setShowInfoBox] = useState(false);
  const [offlineAccess, setOfflineAccess] = useState(false);
  // TODO[trustHost]: const [trustHost, setTrustHost] = useState(false);

  //
  // EVENTS
  //

  const setUrl = useCallback((value) => {
    setClusterUrl(value);
  }, []);

  const handleConnectClick = useCallback(() => {
    const originUrl = getOriginUrl(clusterUrl);
    setClusterUrl(originUrl);

    setShowInfoBox(true);
    onClusterConnect({ clusterUrl: originUrl, clusterName, offlineAccess });
  }, [onClusterConnect, clusterName, clusterUrl, offlineAccess]);

  const handleOfflineAccessChange = useCallback((event, { checked }) => {
    setOfflineAccess(checked);
  }, []);

  // TODO[trustHost]
  // const handleTrustHostChange = useCallback((event, { checked }) => {
  //   setTrustHost(checked);
  // }, []);

  //
  // EFFECTS
  //

  //
  // RENDER
  //

  return (
    <MainContent>
      <Title>{connectionBlock.title()}</Title>
      <Field>
        <label htmlFor="lecc-cluster-name">
          {connectionBlock.clusterName.label()}
          <RequiredMark />
        </label>
        <Input
          type="text"
          theme="round-black" // borders on all sides, rounded corners
          placeholder={connectionBlock.clusterName.placeholder()}
          id="lecc-cluster-name"
          value={clusterName}
          onChange={setClusterName}
          disabled={loading}
          validators={[nameSymbols, mkNameValidator(clouds)]}
          required
          trim
        />
      </Field>
      <Field>
        <label htmlFor="lecc-cluster-url">
          {connectionBlock.clusterUrl.label()}
          <RequiredMark />
        </label>
        <Input
          type="url"
          theme="round-black" // borders on all sides, rounded corners
          id="lecc-cluster-url"
          value={clusterUrl}
          onChange={setUrl}
          validators={[mkCloudAlreadySyncedValidator(clouds)]}
          disabled={loading}
          required
          trim
        />
      </Field>
      <Field>
        <TriStateCheckbox
          label={connectionBlock.offlineAccess.label()}
          help={connectionBlock.offlineAccess.help()}
          onChange={handleOfflineAccessChange}
          value={offlineAccess ? checkValues.CHECKED : checkValues.UNCHECKED}
        />
      </Field>
      {/* // TODO[trustHost] */}
      {/* <Field>
        <TriStateCheckbox
          label={connectionBlock.trustHost.label()}
          help={connectionBlock.trustHost.help()}
          onChange={handleTrustHostChange}
          value={trustHost ? checkValues.CHECKED : checkValues.UNCHECKED}
        />
        {trustHost ? (
          <InlineNotice
            className="trust-host-warning"
            type={noticeTypes.WARNING}
          >
            <p>{connectionBlock.trustHost.warning()}</p>
          </InlineNotice>
        ) : null}
      </Field> */}
      <Button
        primary
        type="button"
        label={connectionBlock.button.label()}
        onClick={handleConnectClick}
        disabled={loading}
      />
      <div>
        {showInfoBox && (
          <InlineNotice className="connection-notice-info">
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
  loading: PropTypes.bool.isRequired,
  onClusterConnect: PropTypes.func.isRequired,
};
