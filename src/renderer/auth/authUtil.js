import { KubernetesClient } from './clients/KubernetesClient';
import { KubernetesEntityClient } from './clients/KubernetesEntityClient';
import { KubernetesAuthorizationClient } from './clients/KubernetesAuthorizationClient';
import { AuthClient } from './clients/AuthClient';
import * as strings from '../../strings';

const entityToClient = {
  cluster: KubernetesEntityClient,
  machine: KubernetesEntityClient,
  namespace: KubernetesClient,
  credential: KubernetesClient,
  openstackcredential: KubernetesEntityClient,
  awscredential: KubernetesEntityClient,
  byocredential: KubernetesEntityClient,
  event: KubernetesClient,
  publickey: KubernetesEntityClient,
  clusterrelease: KubernetesEntityClient,
  kaasrelease: KubernetesEntityClient,
  openstackresource: KubernetesEntityClient,
  awsresource: KubernetesEntityClient,
  authorization: KubernetesAuthorizationClient,
  baremetalhost: KubernetesEntityClient,
  kaascephcluster: KubernetesEntityClient,
};

/**
 * Extracts data from a JWT.
 * @param {string} token The JWT.
 * @returns {Object} JSON object, or `{}` on decode failure.
 */
export function extractJwtPayload(token) {
  if (!token) {
    return {};
  }

  const base64Payload = token.split('.')[1];
  const decoded = decodeURIComponent(
    atob(base64Payload)
      .split('')
      .map((char) => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );

  try {
    return JSON.parse(decoded);
  } catch (err) {
    // ignore
  }

  return {};
}

/**
 * [ASYNC] Refreshes the auth tokens.
 * @param {string} baseUrl MCC URL. Must NOT end with a slash.
 * @param {Object} config MCC Configuration object.
 * @param {Cloud} cloud An Cloud object.
 * @returns {string|undefined} On success, the `cloud` object is updated with new tokens
 *  and expiries, and `undefined` is returned. On error, `cloud` remains unchanged,
 *  and an error message is returned.
 */
export async function refreshToken(baseUrl, config, cloud) {
  const authClient = new AuthClient({ baseUrl, config });
  const { response, body, error } = await authClient.refreshToken(
    cloud.refreshToken
  );

  if (response && response.status === 400) {
    return strings.authUtil.error.sessionExpired();
  } else if (error) {
    return error;
  }

  // token was refreshed
  cloud.updateTokens(body);
}

/**
 * Terminates the session.
 * @param {string} baseUrl MCC URL. Must NOT end with a slash.
 * @param {Object} config MCC Configuration object.
 * @param {Cloud} cloud An Cloud object.
 * @returns {string|undefined} `undefined` if successful; error message otherwise.
 */
export async function logout(baseUrl, config, cloud) {
  const authClient = new AuthClient({ baseUrl, config });
  const { error: refreshError } = await authClient.logout(
    cloud.refreshToken
  );

  if (refreshError) {
    return refreshError;
  }

  return null;
}

/**
 * Makes an authenticated request using the tokens in the `cloud` object.
 * @param {Object} options
 * @param {string} options.baseUrl MCC URL. Must NOT end with a slash.
 * @param {Object} options.config MCC Configuration object.
 * @param {Cloud} options.cloud An Cloud object. NOTE: This instance will be UPDATED
 *  with new tokens if the token is expired and successfully refreshed.
 * @param {string} options.method Name of the method to call on the `entity`.
 * @param {string} options.entity One of the keys from `entityToClient`, the API entity
 *  on which to call the `method`.
 * @param {Object} [options.args] Optional arguments for the `method` on the `entity`.
 * @returns {Object} If successful, `{body: Object}`; otherwise, `{error: string, status: number}`.
 */
export async function authedRequest({
  baseUrl,
  config,
  cloud,
  method,
  entity,
  args,
}) {
  // NOTE: it's useless to fetch if we don't have a token, or we can't refresh it
  if (!cloud.token || cloud.isRefreshTokenExpired()) {
    cloud.resetTokens();
    return { error: strings.authUtil.error.invalidCredentials(), status: 401 };
  }

  const Client = entityToClient[entity];

  // the first attempt to fetch
  let k8sClient = new Client(baseUrl, cloud.token, entity);
  const { response, error, body } = await k8sClient[method](entity, args);

  if (response && response.status === 401) {
    // assume token is expired, try to refresh
    const refreshError = await refreshToken(baseUrl, config, cloud);
    if (refreshError) {
      return { error: refreshError, status: 401 };
    }

    // try to fetch again with updated token
    k8sClient = new Client(baseUrl, cloud.token, entity);
    const {
      response: newResponse,
      error: newError,
      body: newBody,
    } = await k8sClient[method](entity, args);

    return newError
      ? { error: newError, status: newResponse.status }
      : { body: newBody };
  }
  // else, either success with current tokens, or non-auth error

  return error
    ? { error, status: (response && response.status) || 0 }
    : { body };
}
