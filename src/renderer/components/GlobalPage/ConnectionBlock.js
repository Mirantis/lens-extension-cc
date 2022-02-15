import { useState } from 'react';
import PropTypes from 'prop-types';
import { Renderer } from '@k8slens/extensions';
import { InlineNotice } from '../InlineNotice';
import styled from '@emotion/styled';
import { layout } from '../styles';
import { normalizeUrl } from '../../../util/netUtil';
import { connectionBlock } from '../../../strings';
import { cloudStore } from '../../../store/CloudStore';

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

const RequiredMark = styled.span`
  color: var(--colorError);
  margin-left: ${layout.grid}px;
`;

const cloudAlreadySynced = {
  message: () => connectionBlock.notice.urlAlreadyUsed(),
  validate: (url) => !cloudStore?.clouds?.[normalizeUrl(url)],
};

const nameSymbols = {
  message: () => connectionBlock.notice.nameSymbolsAreNotValid(),
  validate: (name) => /^[a-zA-Z0-9_-]*$/.test(name),
};
const nameAlreadyUsed = {
  message: () => connectionBlock.notice.nameAlreadyUsed(),
  validate: (value) =>
    !Object.values(cloudStore.clouds).find(({ name }) => name === value),
};

export const ConnectionBlock = ({ loading, handleClusterConnect }) => {
  const [clusterName, setClusterName] = useState('');
  const [clusterUrl, setClusterUrl] = useState('');
  const [showInfoBox, setShowInfoBox] = useState(true);

  const setUrl = (value) => {
    if (!showInfoBox) {
      setShowInfoBox(true);
    }
    setClusterUrl(value);
  };

  const handleConnectClick = () => {
    setShowInfoBox(false);
    handleClusterConnect(clusterUrl, clusterName);
  };

  return (
    <MainContent>
      <Title>{connectionBlock.title()}</Title>
      <Field>
        <label htmlFor="lecc-cluster-name">
          {connectionBlock.clusterName.label()}
          <RequiredMark>*</RequiredMark>
        </label>
        <Input
          type="text"
          theme="round-black" // borders on all sides, rounded corners
          placeholder={connectionBlock.clusterName.placeholder()}
          id="lecc-cluster-name"
          value={clusterName}
          onChange={setClusterName}
          disabled={loading}
          validators={[nameSymbols, nameAlreadyUsed]}
          required
          trim
        />
      </Field>
      <Field>
        <label htmlFor="lecc-cluster-url">
          {connectionBlock.clusterUrl.label()}
          <RequiredMark>*</RequiredMark>
        </label>
        <Input
          type="url"
          theme="round-black" // borders on all sides, rounded corners
          id="lecc-cluster-url"
          value={clusterUrl}
          onChange={setUrl}
          validators={[cloudAlreadySynced]}
          disabled={loading}
          required
          trim
        />
        <ButtonWrapper>
          <Button
            primary
            type="submit"
            label={connectionBlock.button.label()}
            onClick={handleConnectClick}
            disabled={loading}
          />
        </ButtonWrapper>
      </Field>
      <div>
        {showInfoBox && (
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
  loading: PropTypes.bool.isRequired,
  handleClusterConnect: PropTypes.func.isRequired,
};
