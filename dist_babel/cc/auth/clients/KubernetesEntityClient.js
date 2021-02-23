"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KubernetesEntityClient = void 0;

var _netUtil = require("../../netUtil");

var strings = _interopRequireWildcard(require("../../../strings"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

// no start nor end slashes
const clusterEndpoint = 'apis/cluster.k8s.io/v1alpha1';
const kaasEndpoint = 'apis/kaas.mirantis.com/v1alpha1';
const metalEndpoint = 'apis/metal3.io/v1alpha1';

const namespacePrefix = namespaceName => namespaceName ? `namespaces/${namespaceName}/` : '';
/**
 * @param {string} baseUrl The MCC base URL (i.e. the URL to the MCC UI). Expected to
 *  be "http[s]://<host>" and to NOT end with a slash.
 */


class KubernetesEntityClient {
  constructor(baseUrl, token, entity) {
    if (!baseUrl || !token || !entity) {
      throw new Error('baseUrl, token, and entity are required');
    }

    this.baseUrl = baseUrl.replace(/\/$/, ''); // remove end slash if any

    this.apiPrefix = KubernetesEntityClient.entityApiPrefix[entity];
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
    return (0, _netUtil.request)(`${this.baseUrl}/${this.apiPrefix}/${url}`, {
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

  get(entity, {
    namespaceName,
    name,
    entityDescriptionName
  } = {}) {
    return this.request(`${namespacePrefix(namespaceName)}${entity}s/${name}`, {
      errorMessage: strings.apiClient.errors.failedToGet(entityDescriptionName || entity)
    });
  }

  list(entity, {
    namespaceName,
    entityDescriptionName
  } = {}) {
    return this.request(`${namespacePrefix(namespaceName)}${entity}s`, {
      errorMessage: strings.apiClient.errors.failedToGetList(entityDescriptionName || entity)
    });
  }

  listAll(entity, {
    entityDescriptionName
  } = {}) {
    return this.request(`${entity}s`, {
      errorMessage: strings.apiClient.errors.failedToGetList(entityDescriptionName || entity)
    });
  }

  create(entity, {
    namespaceName,
    config,
    entityDescriptionName
  } = {}) {
    return this.request(`${namespacePrefix(namespaceName)}${entity}s/create`, {
      options: {
        method: 'POST',
        body: JSON.stringify(config)
      },
      expectedStatuses: [201],
      errorMessage: strings.apiClient.errors.failedToCreate(entityDescriptionName || entity)
    });
  }

  delete(entity, {
    namespaceName,
    name,
    entityDescriptionName
  } = {}) {
    return this.request(`${namespacePrefix(namespaceName)}${entity}s/${name}`, {
      options: {
        method: 'DELETE'
      },
      errorMessage: strings.apiClient.errors.failedToDelete(`${entityDescriptionName || entity} "${name}"`)
    });
  }

  update(entity, {
    namespaceName,
    name,
    entityDescriptionName,
    patch
  } = {}) {
    return this.request(`${namespacePrefix(namespaceName)}${entity}s/${name}`, {
      options: {
        method: 'PATCH',
        body: JSON.stringify(patch),
        headers: {
          'Content-Type': 'application/merge-patch+json'
        }
      },
      errorMessage: strings.apiClient.errors.failedToUpdate(`${entityDescriptionName || entity} "${name}"`)
    });
  }

}

exports.KubernetesEntityClient = KubernetesEntityClient;
KubernetesEntityClient.entityApiPrefix = {
  cluster: clusterEndpoint,
  machine: clusterEndpoint,
  publickey: kaasEndpoint,
  openstackcredential: kaasEndpoint,
  awscredential: kaasEndpoint,
  byocredential: kaasEndpoint,
  clusterrelease: kaasEndpoint,
  kaasrelease: kaasEndpoint,
  openstackresource: kaasEndpoint,
  awsresource: kaasEndpoint,
  kaascephcluster: kaasEndpoint,
  baremetalhost: metalEndpoint
};