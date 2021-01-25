//
// Authentication Provider
//

import { createContext, useContext, useState, useMemo } from 'react';
import { AuthClient } from '../auth/clients/AuthClient';
import { ProviderStore } from './ProviderStore';

//
// Store
//

class AuthProviderStore extends ProviderStore {
  // basic store is all that is needed for now
}

const pr = new AuthProviderStore();

//
// Internal Methods
//

/**
 * [ASYNC] Authenticate with MCC and get authorization tokens.
 * @param {Object} options
 * @param {AuthAccess} options.authAccess Current authentication information. This
 *  instance WILL be cleared and updated with new tokens.
 * @param {string} options.cloudUrl MCC URL. Must NOT end with a slash.
 * @param {Object} options.config MCC Config object.
 */
const _authenticate = async function ({ authAccess, config, cloudUrl }) {
  pr.reset(true);

  const authClient = new AuthClient(cloudUrl, config);
  const { error, body } = await authClient.getToken(
    authAccess.username,
    authAccess.password
  );

  pr.loading = false;
  pr.loaded = true;
  pr.store.error = error || undefined;

  if (!error) {
    authAccess.updateTokens(body);
  }

  pr.notifyIfError();
  pr.onChange();
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
  const [state] = context;

  // this is what you actually get from `useAuth()` when you consume it
  return {
    state,

    //// ACTIONS

    actions: {
      /**
       * Authenticates with the MCC server.
       * @param {Object} options
       * @param {AuthAccess} options.authAccess Current authentication information.
       *  This instance WILL be cleared and updated with new tokens.
       * @param {string} options.cloudUrl MCC URL. Must NOT end with a slash.
       * @param {Object} options.config MCC Config object.
       */
      authenticate(options) {
        if (!pr.loading) {
          _authenticate(options);
        }
      },

      /**
       * Imperatively Update the loaded state to `true`. Use this if you already
       *  have a valid AuthAccess instance and don't need to authenticate.
       */
      setAuthenticated() {
        if (!pr.loading) {
          pr.loaded = true;
          pr.store.error = undefined;
          pr.onChange();
        }
      },

      /** Resets store state. Data will need to be reloaded. */
      reset() {
        if (!pr.loading) {
          pr.reset();
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
  const [state, setState] = useState(pr.clone());
  const value = useMemo(() => [state, setState], [state]);

  pr.setState = setState;

  return <AuthContext.Provider value={value} {...props} />;
};
