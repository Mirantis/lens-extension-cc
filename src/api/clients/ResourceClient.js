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

export class ResourceClient {
  // resource type to '/apis/GROUP/VERSION' prefix
  static typeToApiPrefix = {
    [apiResourceTypes.CLUSTER]: clusterEndpoint,
    [apiResourceTypes.CLUSTER_DEPLOYMENT_STATUS]: kaasEndpoint,
    [apiResourceTypes.CLUSTER_UPGRADE_STATUS]: kaasEndpoint,
    [apiResourceTypes.MACHINE]: clusterEndpoint,
    [apiResourceTypes.MACHINE_DEPLOYMENT_STATUS]: kaasEndpoint,
    [apiResourceTypes.MACHINE_UPGRADE_STATUS]: kaasEndpoint,
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

  /**
   * Used to work with namespace-specific Kubernetes resources.
   * @class ResourceClient
   * @param {Object} params
   * @param {string} params.baseUrl The MCC base URL (i.e. the URL to the MCC UI). Expected to
   *  be "http[s]://<host>" and to NOT end with a slash.
   * @param {string} params.token Current/valid SSO access token.
   * @param {string} params.resourceType Type of kube resource to work with. Value from
   *  the `apiResourceTypes` enum.
   * @param {boolean} [params.trustHost] If truthy, TLS verification of the host
   *  __will be skipped__. If falsy, secure requests will fail if the host's certificate
   *  cannot be verified (typically the case when it's self-signed).
   */
  constructor({ baseUrl, token, resourceType, trustHost = false }) {
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
    this.trustHost = !!trustHost;

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
  request(
    endpoint,
    {
      options = {},
      expectedStatuses = [200],
      errorMessage,
      extractBodyMethod,
      trustHost,
    }
  ) {
    return request(
      `${this.baseUrl}/${this.apiPrefix}/${endpoint}`,
      {
        credentials: 'same-origin',
        ...options,
        headers: {
          ...this.headers,
          ...(options?.headers || {}),
        },
      },
      {
        expectedStatuses,
        errorMessage,
        extractBodyMethod,
        trustHost: trustHost === undefined ? this.trustHost : !!trustHost,
      }
    );
  }

  /**
   * Get a single resource.
   * @param {string} resourceType
   * @param {Object} options
   * @param {string} [options.namespaceName] Namespace name, if any.
   * @param {string} [options.resourceName] Resource name, if any.
   * @param {Record<string,any>} [options.filters] Query parameters, if any.
   * @returns {Promise<Object>} See netUtil.request() for response shape.
   */
  get(resourceType, { namespaceName, resourceName, filters } = {}) {
    return this.request(
      `${namespacePrefix(namespaceName)}${resourceType}${
        resourceName ? `/${resourceName}` : ''
      }${buildQueryString(filters)}`,
      {
        errorMessage: strings.apiClient.error.failedToGet(resourceType),
      }
    );
  }

  /**
   * List resources optionally within a given namespace.
   * @param {string} resourceType Value from the `apiResourceTypes` enum.
   * @param {Object} options
   * @param {string} [options.namespaceName]
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
   * @returns {Promise<Object>} See netUtil.request() for response shape.
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
        ...requestOptions,
      },
    });
  }

  /**
   * List all resources across all namespaces.
   * @param {string} resourceType
   * @param {Object} [options]
   * @param {number} [options.limit] To limit the number of items fetched.
   * @returns {Promise<Object>} See netUtil.request() for response shape.
   */
  listAll(resourceType, { limit } = {}) {
    const paramStr = buildQueryString({ limit });
    return this.request(`${resourceType}${paramStr}`, {
      errorMessage: strings.apiClient.error.failedToGetList(resourceType),
    });
  }

  /**
   * @param {string} resourceType
   * @param {Object} options
   * @param {string} options.spec JSON payload.
   * @param {string} [options.namespaceName]
   */
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

  /**
   * @param {string} resourceType
   * @param {Object} options
   * @param {string} options.name
   * @param {Object} options.patch JSON payload.
   * @param {string} [options.namespaceName]
   */
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

  /**
   * @param {string} resourceType
   * @param {Object} options
   * @param {string} options.name
   * @param {string} [options.namespaceName]
   */
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

  reviewRules() {
    return Promise.resolve({
      error: 'Method "reviewRules" not supported on ResourceClient',
      response: undefined,
      expectedStatuses: [],
      body: undefined,
    });
  }

  nsAccess() {
    return Promise.resolve({
      error: 'Method "nsAccess" not supported on ResourceClient',
      response: undefined,
      expectedStatuses: [],
      body: undefined,
    });
  }
}
