import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Renderer } from '@k8slens/extensions';
import { InlineNotice, types as noticeTypes } from '../InlineNotice';
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

  '.connection-notice-info': {
    marginTop: layout.gap,
  },
}));

const TrustHostWarning = styled(InlineNotice)(({ disabled }) => ({
  marginTop: layout.pad,
  marginLeft: 25, // align with Checkbox help text

  // results in text color that matches `var(--textColorDimmed)` used in <TriStateCheckbox/>
  //  when the TrustHost Checkbox is disabled
  opacity: disabled ? 0.55 : undefined,
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

const urlFormatValidator = {
  message: () => connectionBlock.notice.urlWrongFormat(),
  validate: (value) => {
    try {
      // NOTE: `URL` is different under Jest than it is in Lens and would need to be mocked
      // https://github.com/facebook/jest/issues/10045
      return TEST_ENV ? true : Boolean(new URL(value));
    } catch (err) {
      return false;
    }
  },
};

const nameSymbolsValidator = {
  message: () => connectionBlock.notice.nameSymbolsAreNotValid(),
  validate: (name) => /^[a-zA-Z0-9_-]*$/.test(name),
};

const mkUniqueNameValidator = (clouds) => ({
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

export const ConnectionBlock = ({
  loading,
  loaded,
  connectError,
  onClusterConnect,
}) => {
  //
  // STATE
  //

  const { clouds } = useClouds();
  const [clusterName, setClusterName] = useState('');
  const [clusterUrl, setClusterUrl] = useState('');
  const [offlineAccess, setOfflineAccess] = useState(false);
  const [trustHost, setTrustHost] = useState(false);

  //
  // EVENTS
  //

  const handleNameChange = useCallback((value) => {
    setClusterName(value);
  }, []);

  const handleUrlChange = useCallback((value) => {
    setClusterUrl(value);
  }, []);

  const handleConnectClick = useCallback(() => {
    const originUrl = getOriginUrl(clusterUrl);
    setClusterUrl(originUrl);
    onClusterConnect({
      clusterUrl: originUrl,
      clusterName,
      offlineAccess,
      trustHost,
    });
  }, [onClusterConnect, clusterName, clusterUrl, offlineAccess, trustHost]);

  const handleOfflineAccessChange = useCallback((event, { checked }) => {
    setOfflineAccess(checked);
  }, []);

  const handleTrustHostChange = useCallback((event, { checked }) => {
    setTrustHost(checked);
  }, []);

  //
  // EFFECTS
  //

  //
  // RENDER
  //

  const nameValidators = [nameSymbolsValidator, mkUniqueNameValidator(clouds)];
  const urlValidators = [
    urlFormatValidator,
    mkCloudAlreadySyncedValidator(clouds),
  ];

  const nameValid = nameValidators.every((validator) =>
    validator.validate(clusterName)
  );
  const urlValid = urlValidators.every((validator) =>
    validator.validate(clusterUrl)
  );

  return (
    <MainContent>
      <Title>{connectionBlock.title()}</Title>
      <Field>
        <label htmlFor="cclex-cluster-name">
          {connectionBlock.clusterName.label()}
          <RequiredMark />
        </label>
        <Input
          type="text"
          theme="round-black" // borders on all sides, rounded corners
          placeholder={connectionBlock.clusterName.placeholder()}
          id="cclex-cluster-name"
          value={clusterName}
          onChange={handleNameChange}
          disabled={loading || (loaded && !connectError)}
          validators={nameValidators}
          required
          trim
        />
      </Field>
      <Field>
        <label htmlFor="cclex-cluster-url">
          {connectionBlock.clusterUrl.label()}
          <RequiredMark />
        </label>
        <Input
          type="text"
          theme="round-black" // borders on all sides, rounded corners
          id="cclex-cluster-url"
          value={clusterUrl}
          onChange={handleUrlChange}
          validators={urlValidators}
          disabled={loading || (loaded && !connectError)}
          required
          trim
        />
      </Field>
      <Field>
        <TriStateCheckbox
          id="cclex-cluster-offlineToken"
          label={connectionBlock.offlineAccess.label()}
          help={connectionBlock.offlineAccess.help()}
          disabled={loading || (loaded && !connectError)}
          value={offlineAccess ? checkValues.CHECKED : checkValues.UNCHECKED}
          onChange={handleOfflineAccessChange}
        />
      </Field>
      <Field>
        <TriStateCheckbox
          id="cclex-cluster-trustHost"
          label={connectionBlock.trustHost.label()}
          help={connectionBlock.trustHost.help()}
          disabled={loading || (loaded && !connectError)}
          value={trustHost ? checkValues.CHECKED : checkValues.UNCHECKED}
          onChange={handleTrustHostChange}
        />
        {trustHost ? (
          <TrustHostWarning
            type={noticeTypes.WARNING}
            disabled={loading || (loaded && !connectError)} // dim it when field is dimmed to match state
          >
            <p>{connectionBlock.trustHost.warning()}</p>
          </TrustHostWarning>
        ) : null}
      </Field>
      <Button
        primary
        type="button"
        label={connectionBlock.button.label()}
        onClick={handleConnectClick}
        disabled={
          !clusterName ||
          !nameValid ||
          !clusterUrl ||
          !urlValid ||
          loading ||
          (loaded && !connectError)
        }
      />
      <div>
        {loading || connectError ? (
          <InlineNotice className="connection-notice-info">
            <p
              dangerouslySetInnerHTML={{
                __html: connectionBlock.notice.info(),
              }}
            />
          </InlineNotice>
        ) : null}
      </div>
    </MainContent>
  );
};

ConnectionBlock.propTypes = {
  loading: PropTypes.bool,
  loaded: PropTypes.bool,
  connectError: PropTypes.string, // connection error, if any
  onClusterConnect: PropTypes.func.isRequired,
};
ConnectionBlock.defaultProps = {
  loading: false,
  loaded: false,
};
