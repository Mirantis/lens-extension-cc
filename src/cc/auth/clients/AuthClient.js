import queryString from 'query-string';
import { request } from '../../netUtil';

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

  getTokenFromCode(code, offline = false, customClientId) {
    throw new Error(
      'need to fix this method so it does not refer to window.location.origin...'
    ); // DEBUG

    return this.request('token', {
      options: {
        method: 'POST',
        body: queryString.stringify({
          grant_type: 'authorization_code',
          response_type: 'id_token',
          scope: offline ? 'offline_access openid' : 'openid',
          client_id: customClientId || this.clientId,
          redirect_uri: `${window.location.origin}/${
            customClientId ? 'token' : 'auth'
          }`,
          code,
        }),
      },
      errorMessage: 'Failed to get token',
    });
  }

  getToken(username, password, offline = false, customClientId) {
    return this.request('token', {
      options: {
        method: 'POST',
        body: queryString.stringify({
          grant_type: 'password',
          response_type: 'id_token',
          scope: offline ? 'offline_access openid' : 'openid',
          client_id: customClientId || this.clientId,
          username: username,
          password,
        }),
      },
      errorMessage: 'Failed to get token',
    });
  }

  refreshToken(token) {
    return this.request('token', {
      options: {
        method: 'POST',
        body: queryString.stringify({
          grant_type: 'refresh_token',
          response_type: 'id_token',
          scope: 'openid',
          client_id: this.clientId,
          refresh_token: token,
        }),
      },
      errorMessage: 'Failed to refresh token',
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
      errorMessage: 'Failed to logout',
      expectedStatuses: [200, 204],
      extractDataMethod: null,
    });
  }
}
