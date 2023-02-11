import { logger } from './logger';
import { extractJwtPayload } from '../api/apiUtil';
import { ApiClient } from '../api/clients/ApiClient';
import { openBrowser } from '../util/netUtil';
import * as strings from '../strings';

/**
 *  Start authorization with MCC to get the temp access code via the
 *  redirect URI that will use the 'lens://' protocol to redirect the user
 *  to Lens and ultimately call back into `finishAuthorization()`.
 * @param {Object} params
 * @param {Cloud} params.cloud Cloud to authorize with.
 * @param {string} [params.state] Any string that should be returned verbatim
 *  in a `state` request parameter in the redirect request.
 * @throws {Error} If the MCC instance doesn't support SSO.
 * @throws {Error} If the MCC instance has an illegal Keycloak URL.
 */
export const startAuthorization = function ({ cloud, state }) {
  if (cloud.config?.ssoEnabled) {
    const apiClient = new ApiClient({
      config: cloud.config,
      trustHost: cloud.trustHost,
    });
    const url = apiClient.getSsoAuthUrl({ state });
    try {
      openBrowser(url); // open in default browser (will throw if `url` is blacklisted)
    } catch (err) {
      throw new Error(strings.ssoUtil.error.invalidSsoUrl(url));
    }
  } else {
    throw new Error(strings.ssoUtil.error.ssoNotSupported());
  }
};

/**
 * [ASYNC] Completes the authorization process by exchanging the temp access code
 *  for access tokens.
 * @param {Object} params
 * @param {Object} params.oAuth OAuth response data from request for auth code.
 *  See `extEventOauthCodeTs` typeset in `eventBus.ts` for expected shape.
 * @param {Cloud} params.cloud Cloud with which an SSO connection is being authorized.
 *  Tokens WILL be cleared and updated with new ones for the new connection.
 */
export const finishAuthorization = async function ({ oAuth, cloud }) {
  if (!cloud.config?.ssoEnabled) {
    throw new Error(strings.ssoUtil.error.ssoNotSupported());
  }

  const apiClient = new ApiClient({
    config: cloud.config,
    trustHost: cloud.trustHost,
  });
  let body;
  let error;

  if (oAuth.code) {
    ({ body, error } = await apiClient.getToken({ authCode: oAuth.code }));
  } else {
    // no code, something went wrong
    error = oAuth.error || oAuth.error_description || 'unknown';
  }

  if (error) {
    logger.error(
      'ssoUtil.finishAuthorization()',
      `Failed to get tokens from authorization code, error="${error}"`
    );
    throw new Error(error);
  } else {
    const jwt = extractJwtPayload(body.id_token);
    if (jwt.preferred_username) {
      cloud.updateTokens(body);
      cloud.username = jwt.preferred_username;
    } else {
      logger.error(
        'ssoUtil.finishAuthorization()',
        'Failed to get username from token JWT'
      );
      throw new Error('Failed to get username from token JWT');
    }
  }
};
