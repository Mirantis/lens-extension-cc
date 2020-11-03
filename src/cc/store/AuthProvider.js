//
// Authentication Provider
//

import React, { createContext, useContext, useState, useMemo } from 'react';
import { AuthClient } from '../auth/clients/AuthClient';

//
// Store
//

/** @returns {Object} A new store object in its initial state. */
const _mkNewStore = function () {
  return {
    loading: false, // {boolean} true if currently authenticating
    loaded: false, // {boolean} true if authentication is complete (regardless of error)
    error: undefined, // {string} if an authentication error occurred; undefined otherwise
  };
};

// The store defines the initial state and contains the current state
const store = {
  ..._mkNewStore()
};

//
// Internal Methods
//

/**
 * Creates a full clone of the `store`.
 * @returns {Object} Cloned store object.
 */
const _cloneStore = function () {
  return { ...store }; // only primitive props so no need to deep-clone.
};

/**
 * Forces an update to this context's state.
 * @param {function} setState Function to call to update the context's state.
 */
const _triggerContextUpdate = function (setState) {
  // NOTE: by deep-cloning the store, React will detect changes to the root object,
  //  as well as to any nested objects, triggering a render regardless of whether a
  //  component is depending on the root, or on one of its children
  setState(_cloneStore());
};

/**
 * Called when a state property has changed.
 * @param {function} setState Function to call to update the context's state.
 */
const _onStateChanged = function (setState) {
  _triggerContextUpdate(setState);
};

/**
 * Resets store state. Data will need to be reloaded.
 * @param {function} setState Function to call to update the context's state.
 * @param {boolean} [loading] True if resetting because data is loading; false if
 *  just resetting to initial state.
 */
const _reset = function (setState, loading = false) {
  Object.assign(store, _mkNewStore()); // replace all properties with totally new ones
  store.loading = loading;
  _onStateChanged(setState);
};

/**
 * [ASYNC] Authenticate with MCC and get authorization tokens.
 * @param {Object} options
 * @param {AuthState} options.authState Current authentication information. This
 *  instance WILL be cleared and updated with new tokens.
 * @param {string} options.baseUrl MCC URL. Must NOT end with a slash.
 * @param {Object} options.config MCC Config object.
 * @param {string} options.username
 * @param {string} options.password
 * @param {function} setState Function to call to update the context's state.
 */
const _authenticate = async function ({ authState, config, baseUrl, username, password }, setState) {
  _reset(setState, true);

  const authClient = new AuthClient(baseUrl, config);
  const {error, body} = await authClient.getToken(username, password);

  store.loading = false;
  store.loaded = true;
  store.error = error || undefined;

  if (error) {
    store.error = error;
  } else {
    authState.username = username;
    authState.updateTokens(body);
  }

  _onStateChanged(setState);
};

//
// Provider Definition
//

const AuthContext = createContext();

export const useAuth = function () {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  // NOTE: `context` is the value of the `value` prop we set on the
  //  <AuthContext.Provider value={...}/> we return as the <AuthProvider/>
  //  component to wrap all children that should have access to the state (i.e.
  //  all the children that will be able to `useAuth()` to access the state)
  const [state, setState] = context;

  // this is what you actually get from `useAuth()` when you consume it
  return {
    state,

    //// ACTIONS

    actions: {
      /**
       * Authenticates with the MCC server.
       * @param {Object} options
       * @param {AuthState} options.authState Current authentication information.
       *  This instance WILL be cleared and updated with new tokens.
       * @param {string} options.baseUrl MCC URL. Must NOT end with a slash.
       * @param {Object} options.config MCC Config object.
       * @param {string} options.username
       * @param {string} options.password
       */
      authenticate(options) {
        if (!store.loading) {
          _authenticate(options, setState);
        }
      },

      /**
       * Imperatively Update the loaded state to `true`. Use this if you already
       *  have a valid AuthState instance and don't need to authenticate.
       */
      setAuthenticated() {
        if (!store.loading) {
          store.loaded = true;
          store.error = undefined;
          _onStateChanged(setState);
        }
      },

      /** Resets store state. Data will need to be reloaded. */
      reset() {
        if (!store.loading) {
          _reset(setState);
        }
      },
    },
  };
};

export const AuthProvider = function (props) {
  // NOTE: since the state is passed directly (by reference) into the context
  //  returned by the provider, even the initial state should be a clone of the
  //  `store` so that we consistently return a `state` property (in the context)
  //  that is a shallow clone of the `store`
  const [state, setState] = useState(_cloneStore());
  const value = useMemo(() => [state, setState], [state]);

  return <AuthContext.Provider value={value} {...props} />;
};
