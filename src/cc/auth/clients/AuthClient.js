import queryString from 'query-string';
import { request } from '../../netUtil';
import * as strings from '../../../strings';
import { EXT_EVENT_OAUTH_CODE } from '../../../eventBus';
import pkg from '../../../../package.json';

const redirectUri = `lens://extension/${pkg.name}/${EXT_EVENT_OAUTH_CODE}`;
const authRoute = 'protocol/openid-connect'; // NEVER begins/ends with a slash

/**
 * Basic Authentication Client able to get OAuth tokens from username/password,
 *  and refresh those tokens if they expire.
 * @class AuthClient
 * @param {Object} options
 * @param {Object} options.config The MCC Configuration object.
 * @param {string} [options.baseUrl] The MCC base URL (i.e. the URL to the MCC UI). Expected to
 *  be "http[s]://<host>" and to NOT end with a slash. Required only when the configuration
 *  is NOT using SSO. Otherwise, it's ignored and built based on the configuration itself.
 */
export class AuthClient {
  constructor({ baseUrl, config }) {
    if (!config || (!baseUrl && !config.keycloakLogin)) {
      throw new Error(
        'config is always required, and baseUrl is required when config is for basic auth'
      );
    }

    this.usesSso = !!config.keycloakLogin;

    const keycloakConfig = config.keycloak || {};
    const issuerUrl = keycloakConfig['idp-issuer-url'] || ''; // relative, like '/auth/realms/iam'

    let authUrl;
    if (this.usesSso) {
      // auth URL is different from `baseUrl` in this case
      const keyUrl = keycloakConfig.url || ''; // absolute; will be auth base + `issuerUrl`, need to split
      authUrl = keyUrl.replace(issuerUrl, '');
    } else {
      // using basic auth, `baseUrl` is the base URL for auth requests
      authUrl = baseUrl;
    }

    this.baseUrl = authUrl.replace(/\/$/, ''); // remove end slash if any

    // remove any beginning and/or ending slashes
    this.issuerRoute = issuerUrl.replace(/(^\/|\/$)/g, '');

    this.clientId = keycloakConfig['client-id'] || '';
  }

  /**
   * Makes a network request with specified options.
   * @param {string} endpoint API endpoint. Does NOT begin or end with a slash.
   * @param {Object} config
   * @param {Object} [config.options] Request configuration options.
   * @param {Array<number>} [config.expectedStatuses] List of expected success
   *  statuses.
   * @param {string} [config.extractDataMethod] Name of a method on a fetch
   *  response object to call to deserialize/extract/parse data from the response.
   *  Defaults to "json".
   * @returns {Promise<Object>} See netUtil.request() for response shape.
   */
  request(
    endpoint,
    { options = {}, expectedStatuses = [200], errorMessage, extractDataMethod }
  ) {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    return request(
      `${this.baseUrl}/${this.issuerRoute}/${authRoute}/${endpoint}`,
      {
        credentials: 'same-origin',
        ...options,
        headers: { ...headers, ...((options && options.headers) || {}) },
      },
      { expectedStatuses, errorMessage, extractDataMethod }
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
   * @param {string} options.username [BASIC] Credential username.
   * @param {string} options.password [BASIC] Credential password.
   * @param {string} options.authCode [SSO] Authorization code to obtain tokens.
   * @param {boolean} [options.offline] If true, the refresh token generated for the
   *  clusters will be enabled for offline access. WARNING: This is less secure
   *  than a normal refresh token as it will never expire.
   * @param {string} [options.clientId] If specified, this ID will be used instead
   *  of the client ID obtained from the `config` object used to create this
   *  AuthClient instance. Set this to the `idpClientId` of a cluster if generating
   *  access tokens for a specific cluster.
   * @returns {Promise<Object>} See netUtil.request() for response shape. On success,
   *  the `body` property will be an object with the following properties:
   *  - id_token: string
   *  - expires_in: number, SECONDS valid from now
   *  - refresh_token: string
   *  - refresh_expires_in: number, SECONDS valid from now
   */
  getToken({ offline = false, clientId, ...creds }) {
    let grantType;
    let username;
    let password;
    let authCode;

    if (this.usesSso) {
      grantType = 'authorization_code';
      ({ authCode } = creds);
    } else {
      grantType = 'password';
      ({ username, password } = creds);
    }

    return this.request('token', {
      options: {
        method: 'POST',
        body: queryString.stringify({
          response_type: 'id_token',
          scope: offline ? 'offline_access openid' : 'openid',
          client_id: clientId || this.clientId,
          grant_type: grantType,

          // SSO auth (only if vars are defined)
          code: authCode,
          // NOTE: redirect is ignored by the request, but required for SSO authorization,
          //  and must be the same used to obtain the temporary access code
          redirect_uri: redirectUri,

          // basic auth (only if vars are defined)
          username,
          password,
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
      extractDataMethod: null,
    });
  }
}
