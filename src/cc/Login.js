import React, { useState, useEffect } from 'react';
import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Component } from '@k8slens/extensions';
import { layout } from './theme';
import * as strings from '../strings';

const Section = styled.section(function () {
  return {
    '--flex-gap': `${layout.gap}px`,
  };
});

const Field = styled.div(function () {
  return {
    label: {
      // NOTE: defining --flex-gap as a Field container style ends-up setting
      //  the gap not only between children, but also between each Field container,
      //  rather than just between children, so we have to override here
      marginRight: `${layout.pad}px !important`, // override --flex-gap
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
  const fieldClassnames = 'flex gaps align-center';

  return (
    <Section className="lecc-Login flex column gaps">
      <h3>{strings.login.title()}</h3>
      <Field className={fieldClassnames}>
        <label htmlFor="lecc-login-url">{strings.login.url.label()}</label>
        <input // DEBUG TODO: Component.Input causes crash, doesn't seem to be provided
          type="text"
          id="lecc-login-url"
          className="box grow"
          disabled={loading}
          value={baseUrl}
          onChange={handleUrlChange}
        />
      </Field>
      <Field className={fieldClassnames}>
        <label htmlFor="lecc-login-username">
          {strings.login.username.label()}
        </label>
        <input // DEBUG TODO: Component.Input causes crash, doesn't seem to be provided
          type="text"
          id="lecc-login-username"
          className="box"
          disabled={loading}
          value={username}
          onChange={handleUsernameChange}
        />
      </Field>
      <Field className={fieldClassnames}>
        <label htmlFor="lecc-login-password">
          {strings.login.password.label()}
        </label>
        <input // DEBUG TODO: Component.Input causes crash, doesn't seem to be provided
          type="password"
          className="box"
          id="lecc-login-password"
          disabled={loading}
          value={password}
          onChange={handlePasswordChange}
        />
      </Field>
      <div>
        <Component.Button
          className="box nogrow"
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
