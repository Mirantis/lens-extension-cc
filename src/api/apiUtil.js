//
// Utility methods for making Cloud API requests.
//

import * as strings from '../strings';
import { ApiClient } from './clients/ApiClient';
import { KubernetesAuthorizationClient } from './clients/KubernetesAuthorizationClient';
import { KubernetesClient } from './clients/KubernetesClient';
import { KubernetesEntityClient } from './clients/KubernetesEntityClient';
import { logger } from '../util/logger';
import { apiEntities } from './apiConstants';

const entityToClient = {
  [apiEntities.CLUSTER]: KubernetesEntityClient,
  [apiEntities.MACHINE]: KubernetesEntityClient,
  [apiEntities.PUBLIC_KEY]: KubernetesEntityClient, // SSH keys
  [apiEntities.NAMESPACE]: KubernetesClient,
  [apiEntities.CREDENTIAL]: KubernetesClient,
  [apiEntities.OPENSTACK_CREDENTIAL]: KubernetesEntityClient,
  [apiEntities.AWS_CREDENTIAL]: KubernetesEntityClient,
  [apiEntities.EQUINIX_CREDENTIAL]: KubernetesEntityClient,
  [apiEntities.VSPHERE_CREDENTIAL]: KubernetesEntityClient,
  [apiEntities.AZURE_CREDENTIAL]: KubernetesEntityClient,
  [apiEntities.BYO_CREDENTIAL]: KubernetesEntityClient,
  [apiEntities.METAL_CREDENTIAL]: KubernetesClient,
  [apiEntities.EVENT]: KubernetesClient,
  [apiEntities.CLUSTER_RELEASE]: KubernetesEntityClient,
  [apiEntities.KAAS_RELEASE]: KubernetesEntityClient,
  [apiEntities.OPENSTACK_RESOURCE]: KubernetesEntityClient,
  [apiEntities.AWS_RESOURCE]: KubernetesEntityClient,
  [apiEntities.AUTHORIZATION]: KubernetesAuthorizationClient,
  [apiEntities.METAL_HOST]: KubernetesEntityClient,
  [apiEntities.CEPH_CLUSTER]: KubernetesEntityClient,
  [apiEntities.RHEL_LICENSE]: KubernetesEntityClient,
  [apiEntities.PROXY]: KubernetesEntityClient,
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
 * [ASYNC] Refreshes a Cloud's auth tokens.
 * @param {Cloud} cloud A Cloud object.
 * @returns {boolean} On success, the `cloud` object is updated with new tokens and
 *  `true` is returned. On error, `cloud.connectError` is updated with an error message,
 *  and `false` is returned.
 */
export async function cloudRefresh(cloud) {
  const apiClient = new ApiClient({
    baseUrl: cloud.cloudUrl,
    config: cloud.config,
  });
  const { response, body, error } = await apiClient.refreshToken(
    cloud.refreshToken
  );

  if (response && response.status === 400) {
    cloud.connectError = strings.apiUtil.error.sessionExpired();
  } else if (error) {
    cloud.connectError = error;
  }

  if (cloud.connectError) {
    return false;
  }

  // token was refreshed
  cloud.updateTokens(body);
  logger.log('apiUtil.cloudRefresh()', `Refreshed tokens of cloud=${cloud}`);

  return true;
}

/**
 * Terminates a Cloud session.
 * @param {Cloud} cloud An Cloud object.
 * @returns {string|undefined} `undefined` if successful; error message otherwise.
 */
export async function cloudLogout(cloud) {
  const apiClient = new ApiClient({
    baseUrl: cloud.cloudUrl,
    config: cloud.config,
  });
  const { error: refreshError } = await apiClient.logout(cloud.refreshToken);

  if (refreshError) {
    return refreshError;
  }

  return null;
}

/**
 * Makes an authenticated request using the given Cloud.
 * @param {Object} options
 * @param {Cloud} options.cloud An Cloud object. NOTE: This instance will be UPDATED
 *  with new tokens if the token is expired and successfully refreshed.
 * @param {string} options.method Name of the method to call on the `entity`.
 * @param {string} options.entity One of the keys from `entityToClient`, the API entity
 *  on which to call the `method`.
 * @param {Object} [options.args] Optional arguments for the `method` on the `entity`.
 * @returns {Object} If successful, `{body: Object, tokensRefreshed: boolean, cloud: Cloud}`;
 *  otherwise, `{error: string, status: number, cloud: Cloud}`. `tokensRefreshed` is true if
 *  the cloud's access token had expired and was successfully refreshed during the process
 *  of making the request. In either case, `cloud` is a reference to the original `cloud`
 *  given to make the request.
 */
export async function cloudRequest({ cloud, method, entity, args }) {
  // NOTE: it's useless to fetch if we don't have a token, or we can't refresh it
  if (!cloud.connected) {
    cloud.resetTokens();
    return {
      cloud,
      error: strings.apiUtil.error.invalidCredentials(),
      status: 401,
    };
  }

  const Client = entityToClient[entity];
  if (!Client) {
    return {
      cloud,
      error: `Unknown or unmapped entity ${
        typeof entity === 'string' ? `"${entity}"` : entity
      }`,
      status: 0,
    };
  }

  let tokensRefreshed = false;

  // the first attempt to fetch
  let k8sClient = new Client(cloud.cloudUrl, cloud.token, entity);
  let { response, error, body } = await k8sClient[method](entity, args);

  if (response && response.status === 401) {
    // assume token is expired, try to refresh
    tokensRefreshed = await cloudRefresh(cloud);
    if (!tokensRefreshed) {
      return { cloud, error: cloud.connectError, status: 401 };
    }

    // try to fetch again with updated token
    k8sClient = new Client(cloud.cloudUrl, cloud.token, entity);
    ({ response, error, body } = await k8sClient[method](entity, args));
  }

  return error
    ? { cloud, error, status: (response && response.status) || 0 }
    : { cloud, body, tokensRefreshed };
}
