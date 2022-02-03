import { logger } from './logger';
import { extractJwtPayload } from '../renderer/auth/authUtil';
import { AuthClient } from '../renderer/auth/clients/AuthClient';
import { openBrowser } from '../util/netUtil';
import * as strings from '../strings';

/**
 *  Start authorization with MCC to get the temp access code via the
 *  redirect URI that will use the 'lens://' protocol to redirect the user
 *  to Lens and ultimately call back into `finishAuthorization()`.
 * @param {Object} options
 * @param {Object} options.config MCC Config object.
 * @param {string} [options.state] Any string that should be returned verbatim
 *  in a `state` request parameter in the redirect request.
 * @throws {Error} If the MCC instance doesn't support SSO.
 * @throws {Error} If the MCC instance has an illegal Keycloak URL.
 */
export const startAuthorization = function ({ config, state }) {
  const authClient = new AuthClient({ config });

  if (config.keycloakLogin) {
    const url = authClient.getSsoAuthUrl({ state });
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
 *
 * @param {Object} options
 * @param {Object} options.oAuth OAuth response data from request for auth code.
 *  See `extEventOauthCodeTs` typeset in `eventBus.ts` for expected shape.
 * @param {Object} options.config MCC Config object.
 * @param {Cloud} options.cloud Current authentication information.
 *  This instance WILL be cleared and updated with new tokens.
 */
export const finishAuthorization = async function ({ oAuth, config, cloud }) {
  const authClient = new AuthClient({ config });
  let body;
  let error;

  if (oAuth.code) {
    ({ body, error } = await authClient.getToken({ authCode: oAuth.code }));
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
      console.log(
        `^^^^^^^ ssoUtil.finishAuthorization(): updating tokens and username on cloud=${cloud}`
      ); // DEBUG LOG
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
