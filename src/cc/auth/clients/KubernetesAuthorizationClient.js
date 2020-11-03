// DEBUG TODO is this client needed?

import { request } from '../../netUtil';

/**
 * @param {string} baseUrl The MCC base URL (i.e. the URL to the MCC UI). Expected to
 *  be "http[s]://<host>" and to NOT end with a slash.
 */
export class KubernetesAuthorizationClient {
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

  request(url, { options = {}, expectedStatuses = [200], errorMessage }) {
    return request(
      `${this.baseUrl}/${KubernetesAuthorizationClient.apiPrefix}/${url}`,
      {
        credentials: 'same-origin',
        ...options,
        headers: {
          ...this.headers,
          ...((options && options.headers) || {}),
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
      errorMessage: `Failed to get user permissions for "${namespaceName}"`,
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
      errorMessage: 'Failed to get user permissions for projects',
    });
  }
}
