import { request } from '../../util/netUtil';
import * as strings from '../../strings';

/**
 * Used for authenticating with a Kubernetes cluster (i.e. management cluster).
 * @param {string} baseUrl The MCC base URL (i.e. the URL to the MCC UI). Expected to
 *  be "http[s]://<host>" and to NOT end with a slash.
 */
export class AuthorizationClient {
  static apiPrefix = 'apis/authorization.k8s.io/v1'; // no start nor end slashes

  constructor(baseUrl, token) {
    if (!baseUrl || !token) {
      throw new Error('baseUrl and token are required');
    }

    this.baseUrl = baseUrl.replace(/\/$/, ''); // remove end slash if any
    this.token = token;
    this.headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
    };
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
  request(endpoint, { options = {}, expectedStatuses = [200], errorMessage }) {
    return request(
      `${this.baseUrl}/${AuthorizationClient.apiPrefix}/${endpoint}`,
      {
        credentials: 'same-origin',
        ...options,
        headers: {
          ...this.headers,
          ...(options?.headers || {}),
        },
      },
      { expectedStatuses, errorMessage }
    );
  }

  reviewRules(_, { namespaceName }) {
    return this.request('selfsubjectrulesreviews', {
      options: {
        method: 'POST',
        body: JSON.stringify({
          apiVersion: 'authorization.k8s.io/v1',
          kind: 'SelfSubjectRulesReview',
          spec: { namespace: namespaceName },
        }),
      },
      expectedStatuses: [201],
      errorMessage: strings.apiClient.error.failedUserPerms(namespaceName),
    });
  }

  nsAccess(_, { action }) {
    return this.request('selfsubjectaccessreviews', {
      options: {
        method: 'POST',
        body: JSON.stringify({
          apiVersion: 'authorization.k8s.io/v1',
          kind: 'SelfSubjectAccessReview',
          spec: {
            resourceAttributes: { resource: 'namespaces', verb: action },
          },
        }),
      },
      expectedStatuses: [201],
      errorMessage: strings.apiClient.error.failedProjectPerms(),
    });
  }
}
