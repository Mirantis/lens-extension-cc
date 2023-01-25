import queryString from 'query-string';
import { request } from '../../util/netUtil';
import * as strings from '../../strings';
import { EXT_EVENT_OAUTH_CODE } from '../../common/eventBus';
import pkg from '../../../package.json';

const redirectUri = `lens://extension/${pkg.name}/${EXT_EVENT_OAUTH_CODE}`;
const authRoute = 'protocol/openid-connect'; // NEVER begins/ends with a slash

/**
 * Authentication Client able to get OAuth tokens from Keycloak/SSO,
 *  and refresh those tokens if they expire.
 * @class ApiClient
 * @param {Object} options
 * @param {CloudConfig} options.config The MCC Configuration object.
 */
export class ApiClient {
  constructor({ config }) {
    if (!config || !config.ssoEnabled) {
      throw new Error(
        'config is always required and must be for an instance that uses Keycloak/SSO'
      );
    }

    const keycloakConfig = config.keycloak || {};
    const issuerUrl = keycloakConfig['idp-issuer-url'] || ''; // relative, like '/auth/realms/iam'

    // auth URL is different from `baseUrl` under SSO
    const keyUrl = keycloakConfig.url || ''; // absolute; will be auth base + `issuerUrl`, need to split
    const authUrl = keyUrl.replace(issuerUrl, '');

    this.baseUrl = authUrl.replace(/\/$/, ''); // remove end slash if any

    // remove any beginning and/or ending slashes
    this.issuerRoute = issuerUrl.replace(/(^\/|\/$)/g, '');

    this.clientId = keycloakConfig['client-id'] || '';
  }

  /**
   * Makes a request to the API using the netUtil.js `request()` function.
   * @param {string} endpoint Subpath from the `apiPrefix`, not starting with a slash.
   * @param {Object} [options]
   * @param {Object} [options.options] Additional netUtil.js `request()` options.
   * @param {Array<number>} [options.expectedStatuses] If specified, success is based
   *  on the inclusion of the status code in this list; otherwise, it's based on
   *  the 2xx range.
   * @param {string} [options.extractBodyMethod] Name of the method to call on the
   *  Fetch Response object in order to extract/parse the response's data/body.
   *  @see https://developer.mozilla.org/en-US/docs/Web/API/Body for possible values.
   *  If falsy (other than `undefined`), data is not extracted. Defaults to 'json'.
   * @param {string} [options.errorMessage] Error message to use if the request is
   *  deemed to have failed (per other options); otherwise, a generated message
   *  is used, based on response status.
   * @returns {Promise<Object>} See netUtil.request() for response shape.
   */
  request(
    endpoint,
    { options = {}, expectedStatuses = [200], errorMessage, extractBodyMethod }
  ) {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    return request(
      // TODO[trustHost]: need to tell request() to config.trustHost...
      `${this.baseUrl}/${this.issuerRoute}/${authRoute}/${endpoint}`,
      {
        credentials: 'same-origin',
        ...options,
        headers: { ...headers, ...(options?.headers || {}) },
      },
      { expectedStatuses, errorMessage, extractBodyMethod }
    );
  }

  /**
   * Generates the SSO authorization URL for the MCC instance's Keycloak service.
   * @param {Object} options
   * @param {string} [options.state] Any string that should be returned verbatim
   *  in a `state` request parameter in the redirect request.
   * @param {string} [options.clientId] IDP client ID to use instead of the default.
   *  Typically used when generating tokens for a cluster instead of normal user access
   *  tokens.
   * @param {boolean} [options.offline] True if seeking tokens for offline use; false
   *  otherwise.
   * @returns {string} Auth URL to open in a browser.
   */
  getSsoAuthUrl({ state, clientId, offline = false } = {}) {
    return (
      `${this.baseUrl}/${this.issuerRoute}/${authRoute}/auth?` +
      queryString.stringify({
        response_type: 'code',
        scope: `${offline ? 'offline_access ' : ''}openid`,
        client_id: clientId || this.clientId,
        redirect_uri: redirectUri,
        state,
      })
    );
  }

  /**
   * Get access tokens for the MCC instance at the configured base URL.
   * @param {Object} options Some properties are BASIC- or SSO-specific depending
   *  on the type of authentication mechanism the MCC instance uses.
   * @param {string} options.authCode [SSO] Authorization code to obtain tokens.
   * @param {boolean} [options.offline] If true, the refresh token generated for the
   *  clusters will be enabled for offline access. WARNING: This is less secure
   *  than a normal refresh token as it will never expire.
   * @param {string} [options.clientId] If specified, this ID will be used instead
   *  of the client ID obtained from the `config` object used to create this
   *  ApiClient instance. Set this to the `idpClientId` of a cluster if generating
   *  access tokens for a specific cluster.
   * @returns {Promise<Object>} See netUtil.request() for response shape. On success,
   *  the `body` property will be an object with the following properties:
   *  - id_token: string
   *  - expires_in: number, SECONDS valid from now
   *  - refresh_token: string
   *  - refresh_expires_in: number, SECONDS valid from now
   */
  getToken({ offline = false, clientId, authCode }) {
    return this.request('token', {
      options: {
        method: 'POST',
        body: queryString.stringify({
          response_type: 'id_token',
          scope: offline ? 'offline_access openid' : 'openid',
          client_id: clientId || this.clientId,
          grant_type: 'authorization_code',

          // SSO auth (only if vars are defined)
          code: authCode,
          // NOTE: redirect is ignored by the request, but required for SSO authorization,
          //  and must be the same used to obtain the temporary access code
          redirect_uri: redirectUri,
        }),
      },
      errorMessage: strings.apiClient.error.failedToGetToken(),
    });
  }

  /**
   * Obtain new access tokens given a valid refresh token.
   * @param {string} refreshToken
   * @returns {Promise<Object>} See netUtil.request() for response shape. On success,
   *  the `body` property will be an object with the following properties:
   *  - id_token: string
   *  - expires_in: number, SECONDS valid from now
   *  - refresh_token: string
   *  - refresh_expires_in: number, SECONDS valid from now
   */
  refreshToken(refreshToken) {
    return this.request('token', {
      options: {
        method: 'POST',
        body: queryString.stringify({
          grant_type: 'refresh_token',
          response_type: 'id_token',
          scope: 'openid',
          client_id: this.clientId,
          refresh_token: refreshToken,
        }),
      },
      errorMessage: strings.apiClient.error.failedToRefreshToken(),
    });
  }

  logout(token) {
    return this.request('logout', {
      options: {
        method: 'POST',
        body: queryString.stringify({
          client_id: this.clientId,
          refresh_token: token,
        }),
      },
      errorMessage: strings.apiClient.error.failedToLogout(),
      expectedStatuses: [200, 204],
      extractBodyMethod: null,
    });
  }
}
