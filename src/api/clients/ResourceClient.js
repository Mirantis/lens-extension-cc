import { request } from '../../util/netUtil';
import * as strings from '../../strings';
import { apiResourceTypes } from '../apiConstants';
import { logValue } from '../../util/logger';

// no start nor end slashes
const clusterEndpoint = 'apis/cluster.k8s.io/v1alpha1';
const kaasEndpoint = 'apis/kaas.mirantis.com/v1alpha1';
const metalEndpoint = 'apis/metal3.io/v1alpha1';

const namespacePrefix = (namespaceName) =>
  namespaceName ? `namespaces/${namespaceName}/` : '';

/**
 * Used to work with namespace-specific Kubernetes resources.
 * @param {string} baseUrl The MCC base URL (i.e. the URL to the MCC UI). Expected to
 *  be "http[s]://<host>" and to NOT end with a slash.
 */
export class ResourceClient {
  // resource type to '/apis/GROUP/VERSION' prefix
  static typeToApiPrefix = {
    [apiResourceTypes.CLUSTER]: clusterEndpoint,
    [apiResourceTypes.MACHINE]: clusterEndpoint,
    [apiResourceTypes.PUBLIC_KEY]: kaasEndpoint, // SSH keys
    [apiResourceTypes.OPENSTACK_CREDENTIAL]: kaasEndpoint,
    [apiResourceTypes.AWS_CREDENTIAL]: kaasEndpoint,
    [apiResourceTypes.EQUINIX_CREDENTIAL]: kaasEndpoint,
    [apiResourceTypes.VSPHERE_CREDENTIAL]: kaasEndpoint,
    [apiResourceTypes.AZURE_CREDENTIAL]: kaasEndpoint,
    [apiResourceTypes.BYO_CREDENTIAL]: kaasEndpoint,
    // NOTE: BM credentials are handled via the KubernetesClient instead of this one
    [apiResourceTypes.CLUSTER_RELEASE]: kaasEndpoint,
    [apiResourceTypes.KAAS_RELEASE]: kaasEndpoint,
    [apiResourceTypes.OPENSTACK_RESOURCE]: kaasEndpoint,
    [apiResourceTypes.AWS_RESOURCE]: kaasEndpoint,
    [apiResourceTypes.METAL_HOST]: metalEndpoint,
    [apiResourceTypes.CEPH_CLUSTER]: kaasEndpoint,
    [apiResourceTypes.RHEL_LICENSE]: kaasEndpoint,
    [apiResourceTypes.PROXY]: kaasEndpoint,
  };

  constructor(baseUrl, token, resourceType) {
    if (!baseUrl || !token || !resourceType) {
      throw new Error('baseUrl, token, and resourceType are required');
    }

    this.apiPrefix = ResourceClient.typeToApiPrefix[resourceType];
    if (!this.apiPrefix) {
      throw new Error(
        `Unknown or unmapped resourceType=${logValue(resourceType)}`
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

  get(resourceType, { namespaceName, name } = {}) {
    return this.request(
      `${namespacePrefix(namespaceName)}${resourceType}/${name}`,
      {
        errorMessage: strings.apiClient.error.failedToGet(resourceType),
      }
    );
  }

  list(resourceType, { namespaceName } = {}) {
    return this.request(`${namespacePrefix(namespaceName)}${resourceType}`, {
      errorMessage: strings.apiClient.error.failedToGetList(resourceType),
    });
  }

  /** List all resources across all namespaces. */
  listAll(resourceType) {
    return this.request(resourceType, {
      errorMessage: strings.apiClient.error.failedToGetList(resourceType),
    });
  }

  create(resourceType, { namespaceName, spec } = {}) {
    return this.request(
      `${namespacePrefix(namespaceName)}${resourceType}/create`,
      {
        options: { method: 'POST', body: JSON.stringify(spec) },
        expectedStatuses: [201],
        errorMessage: strings.apiClient.error.failedToCreate(resourceType),
      }
    );
  }

  delete(resourceType, { namespaceName, name } = {}) {
    return this.request(
      `${namespacePrefix(namespaceName)}${resourceType}/${name}`,
      {
        options: { method: 'DELETE' },
        errorMessage: strings.apiClient.error.failedToDelete(
          `${logValue(resourceType)} ${logValue(name)}`
        ),
      }
    );
  }

  update(resourceType, { namespaceName, name, patch } = {}) {
    return this.request(
      `${namespacePrefix(namespaceName)}${resourceType}/${name}`,
      {
        options: {
          method: 'PATCH',
          body: JSON.stringify(patch),
          headers: { 'Content-Type': 'application/merge-patch+json' },
        },
        errorMessage: strings.apiClient.error.failedToUpdate(
          `${logValue(resourceType)} ${logValue(name)}`
        ),
      }
    );
  }
}
