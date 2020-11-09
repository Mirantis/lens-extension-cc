import React, { useState, useEffect } from 'react';
import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { layout } from './theme';
import * as strings from '../strings';

const gap = layout.grid * 4;

const Section = styled.section(function () {
  return {
    button: {
      width: layout.grid * 30,
      marginTop: gap,
    },
  };
});

const Field = styled.div(function () {
  return {
    marginTop: gap,

    ':first-of-type': {
      marginTop: 0,
    },

    input: {
      marginLeft: layout.grid,
    },

    'input#login-url': {
      width: 300,
    },
  };
});

export const Login = function (props) {
  //
  // STATE
  //

  const [baseUrl, setBaseUrl] = useState(props.baseUrl || '');
  const [username, setUsername] = useState(props.username || '');
  const [password, setPassword] = useState('');
  const [valid, setValid] = useState(false);

  //
  // EVENTS
  //

  const handleUrlChange = function (event) {
    setBaseUrl(event.target.value);
  };

  const handleUsernameChange = function (event) {
    setUsername(event.target.value);
  };

  const handlePasswordChange = function (event) {
    setPassword(event.target.value);
  };

  const handleClustersClick = function () {
    const { onLogin } = props;
    onLogin({ baseUrl, username, password });
  };

  //
  // EFFECTS
  //

  useEffect(
    function () {
      setValid(!!(baseUrl && username && password));
    },
    [username, password, baseUrl]
  );

  //
  // RENDER
  //

  const { loading } = props;

  return (
    <Section className="lecc-Login flex column gap">
      <h2>{strings.login.title()}</h2>
      <Field>
        <label htmlFor="lecc-login-url">{strings.login.url.label()}</label>
        <input
          type="text"
          id="lecc-login-url"
          disabled={loading}
          value={baseUrl}
          onChange={handleUrlChange}
        />
      </Field>
      <Field>
        <label htmlFor="lecc-login-username">
          {strings.login.username.label()}
        </label>
        <input
          type="text"
          id="lecc-login-username"
          disabled={loading}
          value={username}
          onChange={handleUsernameChange}
        />
      </Field>
      <Field>
        <label htmlFor="lecc-login-password">
          {strings.login.password.label()}
        </label>
        <input
          type="password"
          id="lecc-login-password"
          disabled={loading}
          value={password}
          onChange={handlePasswordChange}
        />
      </Field>
      <button disabled={loading || !valid} onClick={handleClustersClick}>
        {strings.login.action.label()}
      </button>
    </Section>
  );
};

Login.propTypes = {
  onLogin: propTypes.func.isRequired,
  loading: propTypes.bool,
  baseUrl: propTypes.string,
  username: propTypes.string,
};
