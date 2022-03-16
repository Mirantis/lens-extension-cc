//
// Utility methods for making Cloud API requests.
//

import * as strings from '../strings';
import { ApiClient } from './clients/ApiClient';
import { AuthorizationClient } from './clients/AuthorizationClient';
import { KubernetesClient } from './clients/KubernetesClient';
import { ResourceClient } from './clients/ResourceClient';
import { logger, logValue } from '../util/logger';
import { apiResourceTypes } from './apiConstants';

const typeToClient = {
  [apiResourceTypes.CLUSTER]: ResourceClient,
  [apiResourceTypes.MACHINE]: ResourceClient,
  [apiResourceTypes.PUBLIC_KEY]: ResourceClient, // SSH keys
  [apiResourceTypes.NAMESPACE]: KubernetesClient,
  [apiResourceTypes.CREDENTIAL]: KubernetesClient,
  [apiResourceTypes.OPENSTACK_CREDENTIAL]: ResourceClient,
  [apiResourceTypes.AWS_CREDENTIAL]: ResourceClient,
  [apiResourceTypes.EQUINIX_CREDENTIAL]: ResourceClient,
  [apiResourceTypes.VSPHERE_CREDENTIAL]: ResourceClient,
  [apiResourceTypes.AZURE_CREDENTIAL]: ResourceClient,
  [apiResourceTypes.BYO_CREDENTIAL]: ResourceClient,
  [apiResourceTypes.METAL_CREDENTIAL]: KubernetesClient,
  [apiResourceTypes.EVENT]: KubernetesClient,
  [apiResourceTypes.CLUSTER_RELEASE]: ResourceClient,
  [apiResourceTypes.KAAS_RELEASE]: ResourceClient,
  [apiResourceTypes.OPENSTACK_RESOURCE]: ResourceClient,
  [apiResourceTypes.AWS_RESOURCE]: ResourceClient,
  [apiResourceTypes.AUTHORIZATION]: AuthorizationClient,
  [apiResourceTypes.METAL_HOST]: ResourceClient,
  [apiResourceTypes.CEPH_CLUSTER]: ResourceClient,
  [apiResourceTypes.RHEL_LICENSE]: ResourceClient,
  [apiResourceTypes.PROXY]: ResourceClient,
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
  let base64DecodedValue;
  if (typeof atob === 'function') {
    base64DecodedValue = atob(base64Payload);
  } else {
    // assume we're in Node.js env and use Buffer
    base64DecodedValue = Buffer.from(base64Payload, 'base64').toString();
  }
  const decoded = decodeURIComponent(
    base64DecodedValue
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
  const { error: logoutError } = await apiClient.logout(cloud.refreshToken);

  if (logoutError) {
    return logoutError;
  }

  return null;
}

/**
 * Makes an authenticated request using the given Cloud.
 * @param {Object} options
 * @param {Cloud} options.cloud An Cloud object. NOTE: This instance will be UPDATED
 *  with new tokens if the token is expired and successfully refreshed.
 * @param {string} options.method Name of the method to call on the `resourceType`.
 * @param {string} options.resourceType One of the keys (i.e. API resource types) from
 *  the `typeToClient` map. This is the API resource type on which to call the `method`.
 * @param {Object} [options.args] Optional arguments for the `method` on the `resourceType`.
 * @returns {Object} If successful, `{body: Object, tokensRefreshed: boolean, cloud: Cloud}`;
 *  otherwise, `{error: string, status: number, cloud: Cloud}`. `tokensRefreshed` is true if
 *  the cloud's access token had expired and was successfully refreshed during the process
 *  of making the request. In either case, `cloud` is a reference to the original `cloud`
 *  given to make the request.
 */
export async function cloudRequest({ cloud, method, resourceType, args }) {
  // NOTE: it's useless to fetch if we don't have a token, or we can't refresh it
  if (!cloud.connected) {
    cloud.resetTokens();
    return {
      cloud,
      error: strings.apiUtil.error.invalidCredentials(),
      status: 401,
    };
  }

  const Client = typeToClient[resourceType];
  if (!Client) {
    return {
      cloud,
      error: `Unknown or unmapped resourceType=${logValue(resourceType)}`,
      status: 0,
    };
  }

  let tokensRefreshed = false;

  // the first attempt to fetch
  let k8sClient = new Client(cloud.cloudUrl, cloud.token, resourceType);
  let { response, error, body } = await k8sClient[method](resourceType, args);

  if (response && response.status === 401) {
    // assume token is expired, try to refresh
    tokensRefreshed = await cloudRefresh(cloud);
    if (!tokensRefreshed) {
      return { cloud, error: cloud.connectError, status: 401 };
    }

    // try to fetch again with updated token
    k8sClient = new Client(cloud.cloudUrl, cloud.token, resourceType);
    ({ response, error, body } = await k8sClient[method](resourceType, args));
  }

  return error
    ? { cloud, error, status: (response && response.status) || 0 }
    : { cloud, body, tokensRefreshed };
}
