import { Common } from '@k8slens/extensions';
import { logger } from '../../util/logger';
import { extractJwtPayload } from '../auth/authUtil';
import { AuthClient } from '../auth/clients/AuthClient';

//
// Store
//
const { Util } = Common;

//
// Internal Methods
//

/**
 * [ASYNC] Start authorization with MCC to get the temp access code via the
 *  redirect URI that will use the 'lens://' protocol to redirect the user
 *  to Lens and ultimately call back into `_finishAuthorization()`.
 * @param {Object} options
 * @param {Object} options.config MCC Config object.
 */
export const _startAuthorization = async function ({ config }) {
  pr.reset(true);

  const authClient = new AuthClient({ config });

  if (config.keycloakLogin) {
    const url = authClient.getSsoAuthUrl();
    Util.openExternal(url); // open in default browser
  } else {
    pr.loading = false;
    pr.loaded = true;
    pr.error = strings.ssoAuthProvider.error.basicOnly();
  }

  pr.notifyIfError();
  pr.onChange();
};

/**
 * [ASYNC] Completes the authorization process by exchanging the temp access code
 *  for access tokens.
 *
 * NOTE: This method ASSUMES `loading` is `true` (i.e. load is in progress).
 *
 * @param {Object} options
 * @param {Object} options.oAuth OAuth response data from request for auth code.
 *  See `extEventOauthCodeTs` typeset in `eventBus.ts` for expected shape.
 * @param {Object} options.config MCC Config object.
 * @param {Cloud} options.cloud Current authentication information.
 *  This instance WILL be cleared and updated with new tokens.
 */
export const _finishAuthorization = async function ({ oAuth, config, cloud }) {
  if (!pr.loading) {
    // ignore rogue request to complete auth if it was canceled in Lens, but then
    //  user completed request in browser for some reason
    return;
  }

  const authClient = new AuthClient({ config });
  let body;
  let error;

  if (oAuth.code) {
    ({ body, error } = await authClient.getToken({ authCode: oAuth.code }));
  } else {
    // no code, something went wrong
    error = oAuth.error || oAuth.error_description || 'unknown';
  }

  pr.loading = false;
  pr.loaded = true;

  if (error) {
    logger.error(
      'SsoAuthProvider._finishAuthorization()',
      `Failed to get tokens from authorization code, error="${error}"`
    );
    pr.error = strings.ssoAuthProvider.error.authCode();
  } else {
    const jwt = extractJwtPayload(body.id_token);
    if (jwt.preferred_username) {
      cloud.updateTokens(body);
      cloud.username = jwt.preferred_username;
    } else {
      logger.error(
        'SsoAuthProvider._finishAuthorization()',
        'Failed to get username from token JWT'
      );
      pr.error = strings.ssoAuthProvider.error.authCode();
    }
  }

  pr.notifyIfError();
  pr.onChange();
};