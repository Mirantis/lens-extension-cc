import React, { useState, useEffect } from 'react';
import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Component } from '@k8slens/extensions';
import { layout } from './styles';
import { Section } from './Section';
import * as strings from '../strings';

const urlClassName = 'lecc-Login--url';

const Field = styled.div(function () {
  return {
    display: 'flex',
    alignItems: 'center',
    marginBottom: layout.gap,

    ':last-child': {
      marginBottom: 0,
    },

    [`div.Input.${urlClassName}`]: {
      flex: 1,
    },

    '> label': {
      minWidth: layout.grid * 17,
      marginRight: `${layout.pad}px`,
    },
  };
});

export const Login = function ({ loading, disabled, onLogin, ...props }) {
  //
  // STATE
  //

  const [cloudUrl, setBaseUrl] = useState(props.cloudUrl || '');
  const [username, setUsername] = useState(props.username || '');
  const [password, setPassword] = useState(props.password || '');
  const [valid, setValid] = useState(false);

  //
  // EVENTS
  //

  const handleUrlChange = function (value) {
    setBaseUrl(value);
  };

  const handleUsernameChange = function (value) {
    setUsername(value);
  };

  const handlePasswordChange = function (value) {
    setPassword(value);
  };

  const handleClustersClick = function () {
    onLogin({ cloudUrl, username, password });
  };

  //
  // EFFECTS
  //

  useEffect(
    function () {
      setValid(!!(cloudUrl && username && password));
    },
    [username, password, cloudUrl]
  );

  //
  // RENDER
  //

  return (
    <Section className="lecc-Login">
      <h3>{strings.login.title()}</h3>
      <Field>
        <label htmlFor="lecc-login-url">{strings.login.url.label()}</label>
        <Component.Input
          type="text"
          className={urlClassName}
          theme="round-black" // borders on all sides, rounded corners
          id="lecc-login-url"
          disabled={loading}
          value={cloudUrl}
          onChange={handleUrlChange}
        />
      </Field>
      <Field>
        <label htmlFor="lecc-login-username">
          {strings.login.username.label()}
        </label>
        <Component.Input
          type="text"
          theme="round-black" // borders on all sides, rounded corners
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
        <Component.Input
          type="password"
          theme="round-black" // borders on all sides, rounded corners
          id="lecc-login-password"
          disabled={loading}
          value={password}
          onChange={handlePasswordChange}
        />
      </Field>
      <div>
        <Component.Button
          primary
          disabled={loading || disabled || !valid}
          label={strings.login.action.label()}
          waiting={loading}
          onClick={handleClustersClick}
        />
      </div>
    </Section>
  );
};

Login.propTypes = {
  onLogin: propTypes.func.isRequired,
  loading: propTypes.bool, // if data fetch related to login is taking place
  disabled: propTypes.bool, // if login should be disabled entirely
  cloudUrl: propTypes.string,
  username: propTypes.string,
  password: propTypes.string,
};
