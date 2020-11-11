import React, { useState, useEffect } from 'react';
import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Component } from '@k8slens/extensions';
import { layout } from './styles';
import { Section } from './Section';
import * as strings from '../strings';

const urlInputId = 'lecc-login-url';

const Field = styled.div(function () {
  return {
    display: 'flex',
    alignItems: 'center',
    marginBottom: layout.gap,

    ':last-child': {
      marginBottom: 0,
    },

    [`#${urlInputId}`]: {
      flex: 1,
    },

    label: {
      minWidth: layout.grid * 17,
      marginRight: `${layout.pad}px`,
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

  // DEBUG TODO: when switch to Component.Input, callback signature change to (value: any, event: ChangeEvent) => void
  const handleUrlChange = function (event) {
    setBaseUrl(event.target.value);
  };

  // DEBUG TODO: when switch to Component.Input, callback signature change to (value: any, event: ChangeEvent) => void
  const handleUsernameChange = function (event) {
    setUsername(event.target.value);
  };

  // DEBUG TODO: when switch to Component.Input, callback signature change to (value: any, event: ChangeEvent) => void
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
    <Section className="lecc-Login">
      <h3>{strings.login.title()}</h3>
      <Field>
        <label htmlFor={urlInputId}>{strings.login.url.label()}</label>
        <input // DEBUG TODO: Component.Input causes crash, doesn't seem to be provided
          type="text"
          id={urlInputId}
          disabled={loading}
          value={baseUrl}
          onChange={handleUrlChange}
        />
      </Field>
      <Field>
        <label htmlFor="lecc-login-username">
          {strings.login.username.label()}
        </label>
        <input // DEBUG TODO: Component.Input causes crash, doesn't seem to be provided
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
        <input // DEBUG TODO: Component.Input causes crash, doesn't seem to be provided
          type="password"
          id="lecc-login-password"
          disabled={loading}
          value={password}
          onChange={handlePasswordChange}
        />
      </Field>
      <div>
        <Component.Button
          primary
          disabled={loading || !valid}
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
  loading: propTypes.bool,
  baseUrl: propTypes.string,
  username: propTypes.string,
};
