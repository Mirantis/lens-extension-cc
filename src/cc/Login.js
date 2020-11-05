import React, { useState, useEffect } from 'react';
import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { layout } from './theme';

const gap = layout.grid * 4;

const LoginContainer = styled.div(function () {
  return {
    display: 'flex',
    flexDirection: 'column',
    padding: gap,

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
    <LoginContainer className="Login">
      <Field>
        <label htmlFor="login-url">MCC URL:</label>
        <input
          type="text"
          id="login-url"
          disabled={loading}
          value={baseUrl}
          onChange={handleUrlChange}
        />
      </Field>
      <Field>
        <label htmlFor="login-username">Username:</label>
        <input
          type="text"
          id="login-username"
          disabled={loading}
          value={username}
          onChange={handleUsernameChange}
        />
      </Field>
      <Field>
        <label htmlFor="login-password">Password:</label>
        <input
          type="password"
          id="login-password"
          disabled={loading}
          value={password}
          onChange={handlePasswordChange}
        />
      </Field>
      <button disabled={loading || !valid} onClick={handleClustersClick}>
        Get clusters...
      </button>
    </LoginContainer>
  );
};

Login.propTypes = {
  onLogin: propTypes.func.isRequired,
  loading: propTypes.bool,
  baseUrl: propTypes.string,
  username: propTypes.string,
};
