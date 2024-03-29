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
import { Cloud } from '../common/Cloud';

/**
 * @typedef {Object} ApiSuccessResponse
 * @property {boolean} tokensRefreshed True if `cloud` tokens were refreshed as part of the request;
 *  false if not.
 * @property {number} status Status code.
 * @property {Cloud} cloud Cloud used for the request.
 * @property {Object|string} body Deserialized body according to the specified extraction method.
 * @property {string} url Full URL used for the request.
 * @property {string} path Subpath from `cloud` host. Does not begin with a slash.
 */

/**
 * @typedef {Object} ApiErrorResponse
 * @property {string} error Error message. Will always be non-empty.
 * @property {boolean} tokensRefreshed True if `cloud` tokens were refreshed as part of the request;
 *  false if not.
 * @property {number} status Status code.
 * @property {Cloud} cloud Cloud used for the request.
 * @property {Object|string} [body] Deserialized body according to the specified extraction method,
 *  if error had a body.
 * @property {string} [url] Full URL used for the request, if the request was actually sent for
 *  it failed.
 * @property {string} [path] Subpath from `cloud` host. Does not begin with a slash. Only if
 *  the request was actually sent before it failed.
 */

const typeToClient = {
  [apiResourceTypes.CLUSTER]: ResourceClient,
  [apiResourceTypes.CLUSTER_RELEASE]: ResourceClient,
  [apiResourceTypes.CLUSTER_DEPLOYMENT_STATUS]: ResourceClient,
  [apiResourceTypes.CLUSTER_UPGRADE_STATUS]: ResourceClient,
  [apiResourceTypes.MACHINE]: ResourceClient,
  [apiResourceTypes.MACHINE_DEPLOYMENT_STATUS]: ResourceClient,
  [apiResourceTypes.MACHINE_UPGRADE_STATUS]: ResourceClient,
  [apiResourceTypes.PUBLIC_KEY]: ResourceClient, // SSH keys
  [apiResourceTypes.NAMESPACE]: KubernetesClient,
  [apiResourceTypes.CREDENTIAL]: KubernetesClient,
  [apiResourceTypes.OPENSTACK_CREDENTIAL]: ResourceClient,
  [apiResourceTypes.AWS_CREDENTIAL]: ResourceClient,
  [apiResourceTypes.EQUINIX_CREDENTIAL]: ResourceClient,
  [apiResourceTypes.VSPHERE_CREDENTIAL]: ResourceClient,
  [apiResourceTypes.AZURE_CREDENTIAL]: ResourceClient,
  [apiResourceTypes.BYO_CREDENTIAL]: ResourceClient,
  [apiResourceTypes.SECRET]: KubernetesClient,
  [apiResourceTypes.EVENT]: KubernetesClient,
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
  if (!cloud || !(cloud instanceof Cloud)) {
    throw new Error('cloud parameter must be a Cloud instance');
  }

  const apiClient = new ApiClient({
    config: cloud.config,
    trustHost: cloud.trustHost,
  });
  const {
    response,
    body,
    error: refreshError,
  } = await apiClient.refreshToken(cloud.refreshToken);

  const error =
    response?.status === 400
      ? strings.apiUtil.error.sessionExpired()
      : refreshError;

  if (error) {
    logger.error(
      'apiUtil.cloudRefresh()',
      `Unable to refresh expired token: Resetting all tokens; status=${
        response?.status
      }; error=${logValue(error)}; cloud=${cloud}`
    );
    cloud.resetTokens();
    return false;
  }

  // token was refreshed
  logger.log('apiUtil.cloudRefresh()', `Refreshing tokens of cloud=${cloud}`);
  cloud.updateTokens(body);

  return true;
}

/**
 * Terminates a Cloud session.
 * @param {Cloud} cloud An Cloud object.
 * @returns {string|undefined} `undefined` if successful; error message otherwise.
 */
export async function cloudLogout(cloud) {
  if (!cloud || !(cloud instanceof Cloud)) {
    throw new Error('cloud parameter must be a Cloud instance');
  }

  const apiClient = new ApiClient({
    config: cloud.config,
    trustHost: cloud.trustHost,
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
 * @param {string} options.resourceType A value from the `apiResourceTypes` enum. This type must
 *  also be a key in the `typeToClient` map, determining the connection client on which the `method`
 *  will ultimately be called.
 * @param {'get'|'list'|'listAll'|'create'|'update'|'delete'|'reviewRules'|'nsAccess'} [options.method]
 *  Name of the method to call on the `resourceType`. ⚠️ __Not all resource types support the
 *  same methods.__ Request will fail if method isn't supported.
 * @param {Object} [options.args] Optional arguments for the `method` on the `resourceType`.
 * @returns {Promise<ApiSuccessResponse|ApiErrorResponse>}
 */
export async function cloudRequest({
  cloud,
  resourceType,
  method = 'get',
  args,
}) {
  if (!cloud || !(cloud instanceof Cloud)) {
    throw new Error('cloud parameter must be a Cloud instance');
  }

  let tokensRefreshed = false;

  // NOTE: it's useless to fetch if we don't have a token, or we can't refresh it
  if (!cloud.connected) {
    return {
      cloud,
      tokensRefreshed,
      error: strings.apiUtil.error.noTokens(),
      status: 400,
    };
  }

  const Client = typeToClient[resourceType];
  if (!Client) {
    return {
      cloud,
      tokensRefreshed,
      error: strings.apiUtil.error.invalidResourceType(resourceType),
      status: 400,
    };
  }

  // the first attempt to fetch
  let k8sClient = new Client({
    baseUrl: cloud.cloudUrl,
    token: cloud.token,
    resourceType,
    trustHost: cloud.trustHost,
  });
  let { response, error, body, url } = await k8sClient[method](
    resourceType,
    args
  );
  let path = url?.replace(`${cloud.cloudUrl}/`, '');

  if (response?.status === 401) {
    // assume token is expired, try to refresh
    logger.log(
      'apiUtil.cloudRequest()',
      `Request failed (tokens expired); url=${logValue(
        response.url
      )}; cloud=${logValue(cloud.cloudUrl)}`
    );
    tokensRefreshed = await cloudRefresh(cloud);
    if (!tokensRefreshed) {
      return { cloud, tokensRefreshed, error, url, path, status: 401 };
    }

    // try to fetch again with updated token
    k8sClient = new Client({
      baseUrl: cloud.cloudUrl,
      token: cloud.token,
      resourceType,
      trustHost: cloud.trustHost,
    });
    ({ response, error, body, url } = await k8sClient[method](
      resourceType,
      args
    ));
    path = url?.replace(`${cloud.cloudUrl}/`, '');
  }

  return {
    cloud,
    body,
    tokensRefreshed, // may have been refreshed and _then_ error occurred, so always include
    error,
    status: response?.status ?? 0,
    url,
    path,
  };
}
