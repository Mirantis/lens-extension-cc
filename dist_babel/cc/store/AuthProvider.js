"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AuthProvider = exports.useAuth = void 0;

var _react = require("react");

var _AuthClient = require("../auth/clients/AuthClient");

var _ProviderStore = require("./ProviderStore");

var _jsxRuntime = require("@emotion/react/jsx-runtime");

//
// Authentication Provider
//
//
// Store
//
class AuthProviderStore extends _ProviderStore.ProviderStore {// basic store is all that is needed for now
}

const pr = new AuthProviderStore(); //
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

const _authenticate = async function ({
  authAccess,
  config,
  cloudUrl
}) {
  pr.reset(true);
  const authClient = new _AuthClient.AuthClient(cloudUrl, config);
  const {
    error,
    body
  } = await authClient.getToken(authAccess.username, authAccess.password);
  pr.loading = false;
  pr.loaded = true;
  pr.store.error = error || undefined;

  if (!error) {
    authAccess.updateTokens(body);
  }

  pr.notifyIfError();
  pr.onChange();
}; //
// Provider Definition
//


const AuthContext = /*#__PURE__*/(0, _react.createContext)();

const useAuth = function () {
  const context = (0, _react.useContext)(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  } // NOTE: `context` is the value of the `value` prop we set on the
  //  <AuthContext.Provider value={...}/> we return as the <AuthProvider/>
  //  component to wrap all children that should have access to the state (i.e.
  //  all the children that will be able to `useAuth()` to access the state)


  const [state] = context; // this is what you actually get from `useAuth()` when you consume it

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
      }

    }
  };
};

exports.useAuth = useAuth;

const AuthProvider = function (props) {
  // NOTE: since the state is passed directly (by reference) into the context
  //  returned by the provider, even the initial state should be a clone of the
  //  `store` so that we consistently return a `state` property (in the context)
  //  that is a shallow clone of the `store`
  const [state, setState] = (0, _react.useState)(pr.clone());
  const value = (0, _react.useMemo)(() => [state, setState], [state]);
  pr.setState = setState;
  return (0, _jsxRuntime.jsx)(AuthContext.Provider, {
    value: value,
    ...props
  });
};

exports.AuthProvider = AuthProvider;