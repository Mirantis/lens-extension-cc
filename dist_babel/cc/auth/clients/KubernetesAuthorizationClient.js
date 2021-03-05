"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KubernetesAuthorizationClient = void 0;

var _netUtil = require("../../netUtil");

var strings = _interopRequireWildcard(require("../../../strings"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * @param {string} baseUrl The MCC base URL (i.e. the URL to the MCC UI). Expected to
 *  be "http[s]://<host>" and to NOT end with a slash.
 */
class KubernetesAuthorizationClient {
  // no start nor end slashes
  constructor(baseUrl, token) {
    if (!baseUrl || !token) {
      throw new Error('baseUrl and token are required');
    }

    this.baseUrl = baseUrl.replace(/\/$/, ''); // remove end slash if any

    this.token = token;
    this.headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`
    };
  }

  request(url, {
    options = {},
    expectedStatuses = [200],
    errorMessage
  }) {
    return (0, _netUtil.request)(`${this.baseUrl}/${KubernetesAuthorizationClient.apiPrefix}/${url}`, {
      credentials: 'same-origin',
      ...options,
      headers: { ...this.headers,
        ...(options && options.headers || {})
      }
    }, {
      expectedStatuses,
      errorMessage
    });
  }

  reviewRules(_, {
    namespaceName
  }) {
    return this.request('selfsubjectrulesreviews', {
      options: {
        method: 'POST',
        body: JSON.stringify({
          apiVersion: 'authorization.k8s.io/v1',
          kind: 'SelfSubjectRulesReview',
          spec: {
            namespace: namespaceName
          }
        })
      },
      expectedStatuses: [201],
      errorMessage: strings.apiClient.errors.failedUserPerms(namespaceName)
    });
  }

  nsAccess(_, {
    action
  }) {
    return this.request('selfsubjectaccessreviews', {
      options: {
        method: 'POST',
        body: JSON.stringify({
          apiVersion: 'authorization.k8s.io/v1',
          kind: 'SelfSubjectAccessReview',
          spec: {
            resourceAttributes: {
              resource: 'namespaces',
              verb: action
            }
          }
        })
      },
      expectedStatuses: [201],
      errorMessage: strings.apiClient.errors.failedProjectPerms()
    });
  }

}

exports.KubernetesAuthorizationClient = KubernetesAuthorizationClient;
KubernetesAuthorizationClient.apiPrefix = 'apis/authorization.k8s.io/v1';