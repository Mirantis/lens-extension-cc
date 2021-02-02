//
// Basic Authentication Provider (username/password)
//

import { createContext, useContext, useState, useMemo } from 'react';
import { AuthClient } from '../auth/clients/AuthClient';
import { ProviderStore } from './ProviderStore';
import * as strings from '../../strings';

//
// Store
//

class BasicAuthProviderStore extends ProviderStore {
  // basic store is all that is needed for now
}

const pr = new BasicAuthProviderStore();

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

  if (config.keycloakLogin) {
    pr.loading = false;
    pr.loaded = true;
    pr.error = strings.basicAuthProvider.error.ssoOnly();
  } else {
    const authClient = new AuthClient({ baseUrl: cloudUrl, config });
    const { error, body } = await authClient.getToken({
      username: authAccess.username,
      password: authAccess.password,
    });

    pr.loading = false;
    pr.loaded = true;
    pr.error = error || undefined;

    if (!error) {
      authAccess.updateTokens(body);
      authAccess.usesSso = false;
    }
  }

  pr.notifyIfError();
  pr.onChange();
};

//
// Provider Definition
//

const BasicAuthContext = createContext();

export const useBasicAuth = function () {
  const context = useContext(BasicAuthContext);
  if (!context) {
    throw new Error('useBasicAuth must be used within an BasicAuthProvider');
  }

  // NOTE: `context` is the value of the `value` prop we set on the
  //  <BasicAuthContext.Provider value={...}/> we return as the <BasicAuthProvider/>
  //  component to wrap all children that should have access to the state (i.e.
  //  all the children that will be able to `useBasicAuth()` to access the state)
  const [state] = context;

  // this is what you actually get from `useBasicAuth()` when you consume it
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
          pr.error = undefined;
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

export const BasicAuthProvider = function (props) {
  // NOTE: since the state is passed directly (by reference) into the context
  //  returned by the provider, even the initial state should be a clone of the
  //  `store` so that we consistently return a `state` property (in the context)
  //  that is a shallow clone of the `store`
  const [state, setState] = useState(pr.clone());
  const value = useMemo(() => [state, setState], [state]);

  pr.setState = setState;

  return <BasicAuthContext.Provider value={value} {...props} />;
};
