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
 * [ASYNC] Refreshes a Cloud's auth tokens.
 * @param {Cloud} cloud A Cloud object.
 * @returns {boolean} On success, the `cloud` object is updated with new tokens and
 *  `true` is returned. On error, `cloud.connectError` is updated with an error message,
 *  and `false` is returned.
 */
export async function cloudRefresh(cloud) {
  console.log(
    `@@@@@@@ authUtil.cloudRefresh(): refreshing tokens for cloud=${cloud}`
  ); // DEBUG LOG

  const authClient = new AuthClient({
    baseUrl: cloud.cloudUrl,
    config: cloud.config,
  });
  const { response, body, error } = await authClient.refreshToken(
    cloud.refreshToken
  );

  if (response && response.status === 400) {
    cloud.connectError = strings.authUtil.error.sessionExpired();
  } else if (error) {
    cloud.connectError = error;
  }

  if (cloud.connectError) {
    console.error(
      `@@@@@@@ authUtil.cloudRefresh(): ERROR refreshing tokens for cloud=${cloud}`
    ); // DEBUG LOG
    return false;
  }

  console.log(
    `@@@@@@@ authUtil.cloudRefresh(): updating tokens on cloud=${cloud}`
  ); // DEBUG LOG
  // token was refreshed
  cloud.updateTokens(body);

  return true;
}

/**
 * Terminates a Cloud session.
 * @param {Cloud} cloud An Cloud object.
 * @returns {string|undefined} `undefined` if successful; error message otherwise.
 */
export async function cloudLogout(cloud) {
  const authClient = new AuthClient({
    baseUrl: cloud.cloudUrl,
    config: cloud.config,
  });
  const { error: refreshError } = await authClient.logout(cloud.refreshToken);

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
  if (!cloud.isConnected()) {
    cloud.resetTokens();
    return {
      cloud,
      error: strings.authUtil.error.invalidCredentials(),
      status: 401,
    };
  }

  const Client = entityToClient[entity];
  let tokensRefreshed = false;

  // the first attempt to fetch
  const now = Date.now();
  console.log(
    `@@@@@@@ authUtil.cloudRequest(): method=${method}, entity=${entity}, args=${JSON.stringify(
      args
    )}, ID=${now}, cloud=${cloud}`
  ); // DEBUG LOG
  let k8sClient = new Client(cloud.cloudUrl, cloud.token, entity);
  let { response, error, body } = await k8sClient[method](entity, args);

  if (response && response.status === 401) {
    console.log(
      `@@@@@@@ authUtil.cloudRequest(): got 401 response, refreshing tokens, ID=${now}, cloud=${cloud}`
    ); // DEBUG LOG

    // assume token is expired, try to refresh
    tokensRefreshed = await cloudRefresh(cloud);
    if (!tokensRefreshed) {
      return { cloud, error: cloud.connectError, status: 401 };
    }

    // try to fetch again with updated token
    console.log(
      `@@@@@@@ authUtil.cloudRequest(): TOKENS REFRESHED, retrying: method=${method}, entity=${entity}, args=${JSON.stringify(
        args
      )}, ID=${now}, cloud=${cloud}`
    ); // DEBUG LOG
    k8sClient = new Client(cloud.cloudUrl, cloud.token, entity);
    ({ response, error, body } = await k8sClient[method](entity, args));
  }

  return error
    ? { cloud, error, status: (response && response.status) || 0 }
    : { cloud, body, tokensRefreshed };
}
