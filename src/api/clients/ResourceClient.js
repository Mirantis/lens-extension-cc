import { request, buildQueryString } from '../../util/netUtil';
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

  request(
    url,
    { options = {}, expectedStatuses = [200], errorMessage, extractBodyMethod }
  ) {
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
      { expectedStatuses, errorMessage, extractBodyMethod }
    );
  }

  get(resourceType, { namespaceName, resourceName } = {}) {
    return this.request(
      `${namespacePrefix(namespaceName)}${resourceType}/${resourceName}`,
      {
        errorMessage: strings.apiClient.error.failedToGet(resourceType),
      }
    );
  }

  /**
   * List resources within a given namespace.
   * @param {string} resourceType Value from the `apiResourceTypes` enum.
   * @param {Object} options
   * @param {string} options.namespaceName
   * @param {number} [options.limit] To limit the number of items fetched.
   * @param {string} [options.resourceVersion] If specified, establishes a __watch__ on the
   *  __collection__, from that version on (to get change notifications via long-poll).
   *  NOTE: This is __not__ related to `options.resourceName`.
   * @param {string} [options.resourceName] Name of the resource to scope a sub-resource query.
   *  Required in order to use `subResourceType`.
   * @param {string} [options.subResourceType] Sub-resource type, scoped to `resourceName`.
   *  Ignored if `resourceName` is falsy. Value from the `apiResourceTypes` enum.
   * @param {any} [options.requestOptions] Any remaining properties in the `options` object are
   *  passed down to the raw request as node-fetch options.
   */
  list(
    resourceType,
    {
      namespaceName,
      limit,
      resourceVersion,
      resourceName,
      subResourceType,
      ...requestOptions
    } = {}
  ) {
    const paramStr = buildQueryString({
      limit,
      ...(resourceVersion ? { watch: 1, resourceVersion } : {}),
    });

    let url = `${namespacePrefix(namespaceName)}${resourceType}`;
    if (resourceName && subResourceType) {
      url = `${url}/${resourceName}/${subResourceType}`;
    }
    url = `${url}${paramStr}`;

    return this.request(url, {
      errorMessage: strings.apiClient.error.failedToGetList(resourceType),
      extractBodyMethod: resourceVersion ? 'text' : 'json', // watches respond with multiple JSON documents
      options: {
        // TODO[PRODX-22469]: A timeout helps, but still, we never get content from the body.
        //  We just get a timeout error waiting for body content.
        // timeout: resourceVersion ? 30000 : 0, // milliseconds (0 -> Infinity)
        ...requestOptions,
      },
    });
  }

  /**
   * List all resources across all namespaces.
   * @param {string} resourceType
   * @param {Object} [options]
   * @param {number} [options.limit] To limit the number of items fetched.
   */
  listAll(resourceType, { limit } = {}) {
    const paramStr = buildQueryString({ limit });
    return this.request(`${resourceType}${paramStr}`, {
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
