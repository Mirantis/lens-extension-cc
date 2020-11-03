import { request } from '../../netUtil';

 // no start nor end slashes
const clusterEndpoint = 'apis/cluster.k8s.io/v1alpha1';
const kaasEndpoint = 'apis/kaas.mirantis.com/v1alpha1';
const metalEndpoint = 'apis/metal3.io/v1alpha1';

const namespacePrefix = (namespaceName) =>
  namespaceName ? `namespaces/${namespaceName}/` : '';

/**
 * @param {string} baseUrl The MCC base URL (i.e. the URL to the MCC UI). Expected to
 *  be "http[s]://<host>" and to NOT end with a slash.
 */
export class KubernetesEntityClient {
  static entityApiPrefix = {
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
    baremetalhost: metalEndpoint,
  };

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
      Authorization: `Bearer ${this.token}`,
    };
  }

  request(url, { options = {}, expectedStatuses = [200], errorMessage }) {
    return request(
      `${this.baseUrl}/${this.apiPrefix}/${url}`,
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

  get(entity, { namespaceName, name, entityDescriptionName } = {}) {
    return this.request(`${namespacePrefix(namespaceName)}${entity}s/${name}`, {
      errorMessage: `Failed to get ${entityDescriptionName || entity}`,
    });
  }

  list(entity, { namespaceName, entityDescriptionName } = {}) {
    return this.request(`${namespacePrefix(namespaceName)}${entity}s`, {
      errorMessage: `Failed to get ${entityDescriptionName || entity}s list`,
    });
  }

  listAll(entity, { entityDescriptionName } = {}) {
    return this.request(`${entity}s`, {
      errorMessage: `Failed to get ${entityDescriptionName || entity}s list`,
    });
  }

  create(entity, { namespaceName, config, entityDescriptionName } = {}) {
    return this.request(`${namespacePrefix(namespaceName)}${entity}s/create`, {
      options: { method: 'POST', body: JSON.stringify(config) },
      expectedStatuses: [201],
      errorMessage: `Failed to create ${entityDescriptionName || entity}`,
    });
  }

  delete(
    entity,
    {
      namespaceName,
      name,
      actionDescription = 'delete',
      entityDescriptionName,
    } = {}
  ) {
    return this.request(`${namespacePrefix(namespaceName)}${entity}s/${name}`, {
      options: { method: 'DELETE' },
      errorMessage: `Failed to ${actionDescription} ${
        entityDescriptionName || entity
      } "${name}"`,
    });
  }

  update(entity, { namespaceName, name, entityDescriptionName, patch } = {}) {
    return this.request(`${namespacePrefix(namespaceName)}${entity}s/${name}`, {
      options: {
        method: 'PATCH',
        body: JSON.stringify(patch),
        headers: { 'Content-Type': 'application/merge-patch+json' },
      },
      errorMessage: `Failed to update ${
        entityDescriptionName || entity
      } "${name}"`,
    });
  }
}
