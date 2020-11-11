import queryString from 'query-string';
import { request } from '../../netUtil';
import * as strings from '../../../strings';

const authRoute = 'protocol/openid-connect'; // NEVER begins/ends with a slash

/**
 * @class AuthClient
 * @param {string} baseUrl The MCC base URL (i.e. the URL to the MCC UI). Expected to
 *  be "http[s]://<host>" and to NOT end with a slash.
 * @param {Object} config The MCC Configuration object.
 */
export class AuthClient {
  constructor(baseUrl, config) {
    if (!baseUrl || !config) {
      throw new Error('baseUrl and config are required');
    }

    const keycloakConfig = (config || {}).keycloak || {};

    this.baseUrl = baseUrl.replace(/\/$/, ''); // remove end slash if any
    this.clientId = keycloakConfig['client-id'];

    // remove any beginning and/or ending slashes
    this.issuerRoute = (keycloakConfig['idp-issuer-url'] || '').replace(
      /(^\/|\/$)/g,
      ''
    );
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
   * Get access tokens for the configured base URL.
   * @param {string} username
   * @param {string} password
   * @param {boolean} [offline] If true, the refresh token generated for the
   *  clusters will be enabled for offline access. WARNING: This is less secure
   *  than a normal refresh token as it will never expire.
   * @param {string} [customClientId] If specified, this ID will be used instead
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
  getToken(username, password, offline = false, customClientId = undefined) {
    return this.request('token', {
      options: {
        method: 'POST',
        body: queryString.stringify({
          grant_type: 'password',
          response_type: 'id_token',
          scope: offline ? 'offline_access openid' : 'openid',
          client_id: customClientId || this.clientId,
          username,
          password,
        }),
      },
      errorMessage: strings.apiClient.errors.failedToGetToken(),
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
      errorMessage: strings.apiClient.errors.failedToRefreshToken(),
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
      errorMessage: strings.apiClient.errors.failedToLogout(),
      expectedStatuses: [200, 204],
      extractDataMethod: null,
    });
  }
}
