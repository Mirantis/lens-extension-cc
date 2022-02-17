import { request } from '../../util/netUtil';
import * as strings from '../../strings';
import { apiEntities } from '../apiConstants';

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
    [apiEntities.CLUSTER]: clusterEndpoint,
    [apiEntities.MACHINE]: clusterEndpoint,
    [apiEntities.PUBLIC_KEY]: kaasEndpoint, // SSH keys
    [apiEntities.OPENSTACK_CREDENTIAL]: kaasEndpoint,
    [apiEntities.AWS_CREDENTIAL]: kaasEndpoint,
    [apiEntities.EQUINIX_CREDENTIAL]: kaasEndpoint,
    [apiEntities.VSPHERE_CREDENTIAL]: kaasEndpoint,
    [apiEntities.AZURE_CREDENTIAL]: kaasEndpoint,
    [apiEntities.BYO_CREDENTIAL]: kaasEndpoint,
    // NOTE: BM credentials are handled via the KubernetesClient instead of this one
    [apiEntities.CLUSTER_RELEASE]: kaasEndpoint,
    [apiEntities.KAAS_RELEASE]: kaasEndpoint,
    [apiEntities.OPENSTACK_RESOURCE]: kaasEndpoint,
    [apiEntities.AWS_RESOURCE]: kaasEndpoint,
    [apiEntities.METAL_HOST]: metalEndpoint,
    [apiEntities.CEPH_CLUSTER]: kaasEndpoint,
    [apiEntities.RHEL_LICENSE]: kaasEndpoint,
    [apiEntities.PROXY]: kaasEndpoint,
  };

  constructor(baseUrl, token, entity) {
    if (!baseUrl || !token || !entity) {
      throw new Error('baseUrl, token, and entity are required');
    }

    this.apiPrefix = KubernetesEntityClient.entityApiPrefix[entity];
    if (!this.apiPrefix) {
      throw new Error(
        `Unknown or unmapped entity ${
          typeof entity === 'string' ? `"${entity}"` : entity
        }`
      );
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
    return this.request(`${namespacePrefix(namespaceName)}${entity}/${name}`, {
      errorMessage: strings.apiClient.error.failedToGet(
        entityDescriptionName || entity
      ),
    });
  }

  list(entity, { namespaceName, entityDescriptionName } = {}) {
    return this.request(`${namespacePrefix(namespaceName)}${entity}`, {
      errorMessage: strings.apiClient.error.failedToGetList(
        entityDescriptionName || entity
      ),
    });
  }

  listAll(entity, { entityDescriptionName } = {}) {
    return this.request(entity, {
      errorMessage: strings.apiClient.error.failedToGetList(
        entityDescriptionName || entity
      ),
    });
  }

  create(entity, { namespaceName, config, entityDescriptionName } = {}) {
    return this.request(`${namespacePrefix(namespaceName)}${entity}/create`, {
      options: { method: 'POST', body: JSON.stringify(config) },
      expectedStatuses: [201],
      errorMessage: strings.apiClient.error.failedToCreate(
        entityDescriptionName || entity
      ),
    });
  }

  delete(entity, { namespaceName, name, entityDescriptionName } = {}) {
    return this.request(`${namespacePrefix(namespaceName)}${entity}/${name}`, {
      options: { method: 'DELETE' },
      errorMessage: strings.apiClient.error.failedToDelete(
        `${entityDescriptionName || entity} "${name}"`
      ),
    });
  }

  update(entity, { namespaceName, name, entityDescriptionName, patch } = {}) {
    return this.request(`${namespacePrefix(namespaceName)}${entity}/${name}`, {
      options: {
        method: 'PATCH',
        body: JSON.stringify(patch),
        headers: { 'Content-Type': 'application/merge-patch+json' },
      },
      errorMessage: strings.apiClient.error.failedToUpdate(
        `${entityDescriptionName || entity} "${name}"`
      ),
    });
  }
}
