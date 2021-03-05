"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KubernetesClient = void 0;

var _netUtil = require("../../netUtil");

var strings = _interopRequireWildcard(require("../../../strings"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * @param {string} baseUrl The MCC base URL (i.e. the URL to the MCC UI). Expected to
 *  be "http[s]://<host>" and to NOT end with a slash.
 */
class KubernetesClient {
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
    return (0, _netUtil.request)(`${this.baseUrl}/${KubernetesClient.apiPrefix}/${url}`, {
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

  list(entity, {
    namespaceName,
    entityDescriptionName
  } = {}) {
    const url = {
      namespace: 'namespaces',
      credential: `namespaces/${namespaceName}/secrets`,
      event: `namespaces/${namespaceName}/events`
    };
    return this.request(url[entity], {
      errorMessage: strings.apiClient.errors.failedToGet(entityDescriptionName || entity)
    });
  }

  create(entity, {
    namespaceName,
    config,
    entityDescriptionName
  } = {}) {
    const url = {
      namespace: 'namespaces',
      credential: `namespaces/${namespaceName}/secrets`
    };
    return this.request(url[entity], {
      options: {
        method: 'POST',
        body: JSON.stringify(config)
      },
      expectedStatuses: [201],
      errorMessage: strings.apiClient.errors.failedToCreate(`${entityDescriptionName || entity} "${config.metadata.name}"`)
    });
  }

  delete(entity, {
    namespaceName,
    name,
    entityDescriptionName
  } = {}) {
    const url = {
      namespace: `namespaces/${name}`,
      credential: `namespaces/${namespaceName}/secrets/${name}`
    };
    return this.request(url[entity], {
      options: {
        method: 'DELETE'
      },
      errorMessage: strings.apiClient.errors.failedToDelete(`${entityDescriptionName || entity} "${name}"`)
    });
  }

}

exports.KubernetesClient = KubernetesClient;
KubernetesClient.apiPrefix = 'api/v1';