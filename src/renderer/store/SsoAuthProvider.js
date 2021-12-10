//
// SSO Authentication Provider (Keycloak)
//

import { createContext, useContext, useState, useMemo } from 'react';
import { ProviderStore } from './ProviderStore';
import { ssoUtil } from '../../util/ssoUtil';
import * as strings from '../../strings';

class SsoAuthProviderStore extends ProviderStore {
  // basic store is all that is needed for now
}

const pr = new SsoAuthProviderStore();

//
// Provider Definition
//

const SsoAuthContext = createContext();

export const useSsoAuth = function () {
  const context = useContext(SsoAuthContext);
  if (!context) {
    throw new Error('useSsoAuth must be used within an SsoAuthProvider');
  }

  // NOTE: `context` is the value of the `value` prop we set on the
  //  <SsoAuthContext.Provider value={...}/> we return as the <SsoAuthProvider/>
  //  component to wrap all children that should have access to the state (i.e.
  //  all the children that will be able to `useSsoAuth()` to access the state)
  const [state] = context;

  // this is what you actually get from `useSsoAuth()` when you consume it
  return {
    state,

    //// ACTIONS

    actions: {
      /**
       * Begins the authorization process for the Lens app with the MCC server via
       *  user SSO authentication.
       * @param {Object} options
       * @param {Object} options.config MCC Config object.
       */
      startAuthorization(options) {
        if (!pr.loading) {
          pr.reset(true);

          // must not be loading (we can only handle one load at a time)
          try {
            ssoUtil.startAuthorization(options);
          } catch (error) {
            pr.loading = false;
            pr.loaded = true;
            pr.error = error;
          }

          pr.notifyIfError();
          pr.onChange();
        }
      },

      /**
       * Finishes the authorization process given the temporary access code, by
       *  exchanging it for access tokens.
       * @param {Object} options
       * @param {string} code Temporary access code.
       * @param {Object} options.config MCC Config object.
       * @param {Cloud} options.cloud Current authentication information.
       *  This instance WILL be cleared and updated with new tokens.
       */
      finishAuthorization(options) {
        if (pr.loading) {
          // must be loading (i.e. in the middle of the process)
          try {
            ssoUtil.finishAuthorization(options);
          } catch (error) {
            pr.error = error;
          }

          pr.loading = false;
          pr.loaded = true;
          pr.notifyIfError();
          pr.onChange();
        }
      },

      /**
       * Imperatively update the loaded state to `true`. Use this if you already
       *  have a valid Cloud instance and don't need to authenticate.
       */
      setAuthorized() {
        if (!pr.loading) {
          pr.loaded = true;
          pr.error = undefined;
          pr.onChange();
        }
      },

      /**
       * Cancels an outstanding request, putting the provider into an error state.
       * @params {Object} options
       * @param {string} [options.reason] Reason for cancelation (becomes error message).
       *  Defaults to "user canceled" message.
       * @param {boolean} [options.notify] If true, error notification will be displayed;
       *  otherwise, error is silent.
       */
      cancel({
        reason = strings.ssoAuthProvider.error.userCanceled(),
        notify = false,
      } = {}) {
        if (pr.loading) {
          pr.loading = false;
          pr.loaded = true;
          pr.error = reason;

          if (notify) {
            pr.notifyIfError();
          }
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

export const SsoAuthProvider = function (props) {
  // NOTE: since the state is passed directly (by reference) into the context
  //  returned by the provider, even the initial state should be a clone of the
  //  `store` so that we consistently return a `state` property (in the context)
  //  that is a shallow clone of the `store`
  const [state, setState] = useState(pr.clone());
  const value = useMemo(() => [state, setState], [state]);

  pr.setState = setState;

  return <SsoAuthContext.Provider value={value} {...props} />;
};
