"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.extractJwtPayload = extractJwtPayload;
exports.refreshToken = refreshToken;
exports.logout = logout;
exports.authedRequest = authedRequest;

var _KubernetesClient = require("./clients/KubernetesClient");

var _KubernetesEntityClient = require("./clients/KubernetesEntityClient");

var _KubernetesAuthorizationClient = require("./clients/KubernetesAuthorizationClient");

var _AuthClient = require("./clients/AuthClient");

var strings = _interopRequireWildcard(require("../../strings"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const entityToClient = {
  cluster: _KubernetesEntityClient.KubernetesEntityClient,
  machine: _KubernetesEntityClient.KubernetesEntityClient,
  namespace: _KubernetesClient.KubernetesClient,
  credential: _KubernetesClient.KubernetesClient,
  openstackcredential: _KubernetesEntityClient.KubernetesEntityClient,
  awscredential: _KubernetesEntityClient.KubernetesEntityClient,
  byocredential: _KubernetesEntityClient.KubernetesEntityClient,
  event: _KubernetesClient.KubernetesClient,
  publickey: _KubernetesEntityClient.KubernetesEntityClient,
  clusterrelease: _KubernetesEntityClient.KubernetesEntityClient,
  kaasrelease: _KubernetesEntityClient.KubernetesEntityClient,
  openstackresource: _KubernetesEntityClient.KubernetesEntityClient,
  awsresource: _KubernetesEntityClient.KubernetesEntityClient,
  authorization: _KubernetesAuthorizationClient.KubernetesAuthorizationClient,
  baremetalhost: _KubernetesEntityClient.KubernetesEntityClient,
  kaascephcluster: _KubernetesEntityClient.KubernetesEntityClient
};
/**
 * Extracts data from a JWT.
 * @param {string} token The JWT.
 * @returns {Object} JSON object, or `{}` on decode failure.
 */

function extractJwtPayload(token) {
  if (!token) {
    return {};
  }

  const base64Payload = token.split('.')[1];
  const decoded = decodeURIComponent(atob(base64Payload).split('').map(char => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2)).join(''));

  try {
    return JSON.parse(decoded);
  } catch (err) {// ignore
  }

  return {};
}
/**
 * [ASYNC] Refreshes the auth tokens.
 * @param {string} baseUrl MCC URL. Must NOT end with a slash.
 * @param {Object} config MCC Configuration object.
 * @param {AuthAccess} authAccess An AuthAccess object.
 * @returns {string|undefined} On success, the `authAccess` object is updated with new tokens
 *  and expiries, and `undefined` is returned. On error, `authAccess` remains unchanged,
 *  and an error message is returned.
 */


async function refreshToken(baseUrl, config, authAccess) {
  const authClient = new _AuthClient.AuthClient(baseUrl, config);
  const {
    response,
    body,
    error
  } = await authClient.refreshToken(authAccess.refreshToken);

  if (response && response.status === 400) {
    return strings.authUtil.errors.sessionExpired();
  } else if (error) {
    return error;
  } // token was refreshed


  authAccess.updateTokens(body);
}
/**
 * Terminates the session.
 * @param {string} baseUrl MCC URL. Must NOT end with a slash.
 * @param {Object} config MCC Configuration object.
 * @param {AuthAccess} authAccess An AuthAccess object.
 * @returns {string|undefined} `undefined` if successful; error message otherwise.
 */


async function logout(baseUrl, config, authAccess) {
  const authClient = new _AuthClient.AuthClient(baseUrl, config);
  const {
    error: refreshError
  } = await authClient.logout(authAccess.refreshToken);

  if (refreshError) {
    return refreshError;
  }

  return null;
}
/**
 * Makes an authenticated request using the tokens in the app state.
 * @param {Object} options
 * @param {string} options.baseUrl MCC URL. Must NOT end with a slash.
 * @param {Object} options.config MCC Configuration object.
 * @param {AuthAccess} options.authAccess An AuthAccess object. NOTE: This instance will be UPDATED
 *  with new tokens if the token is expired and successfully refreshed.
 * @param {string} options.method Name of the method to call on the `entity`.
 * @param {string} options.entity One of the keys from `entityToClient`, the API entity
 *  on which to call the `method`.
 * @param {Object} [options.args] Optional arguments for the `method` on the `entity`.
 * @returns {Object} If successful, `{body: Object}`; otherwise, `{error: string, status: number}`.
 */


async function authedRequest({
  baseUrl,
  config,
  authAccess,
  method,
  entity,
  args
}) {
  // NOTE: it's useless to fetch if we don't have a token, or we can't refresh it
  if (!authAccess.token || authAccess.isRefreshTokenExpired()) {
    authAccess.clearTokens();
    return {
      error: strings.authUtil.errors.invalidCredentials(),
      status: 401
    };
  }

  const Client = entityToClient[entity]; // the first attempt to fetch

  let k8sClient = new Client(baseUrl, authAccess.token, entity);
  const {
    response,
    error,
    body
  } = await k8sClient[method](entity, args);

  if (response && response.status === 401) {
    // assume token is expired, try to refresh
    const refreshError = await refreshToken(baseUrl, config, authAccess);

    if (refreshError) {
      return {
        error: refreshError,
        status: 401
      };
    } // try to fetch again with updated token


    k8sClient = new Client(baseUrl, authAccess.token, entity);
    const {
      response: newResponse,
      error: newError,
      body: newBody
    } = await k8sClient[method](entity, args);
    return newError ? {
      error: newError,
      status: newResponse.status
    } : {
      body: newBody
    };
  } // else, either success with current tokens, or non-auth error


  return error ? {
    error,
    status: response && response.status || 0
  } : {
    body
  };
}