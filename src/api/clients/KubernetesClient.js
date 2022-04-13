import { request, buildQueryString } from '../../util/netUtil';
import * as strings from '../../strings';
import { apiResourceTypes } from '../apiConstants';
import { logValue } from '../../util/logger';

/**
 * Used to work with Kubernetes cluster-wide resources (i.e. not in a namespace) resources
 *  such as namespaces.
 * @param {string} baseUrl The MCC base URL (i.e. the URL to the MCC UI). Expected to
 *  be "http[s]://<host>" and to NOT end with a slash.
 */
export class KubernetesClient {
  static apiPrefix = 'api/v1'; // no start nor end slashes

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

  request(
    url,
    { options = {}, expectedStatuses = [200], errorMessage, extractBodyMethod }
  ) {
    return request(
      `${this.baseUrl}/${KubernetesClient.apiPrefix}/${url}`,
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

  /**
   * List resources within a given namespace.
   * @param {string} resourceType
   * @param {Object} options
   * @param {string} options.namespaceName
   * @param {number} [options.limit] To limit the number of items fetched.
   * @param {string} [options.resourceVersion] If specified, establishes a __watch__ on the
   *  __collection__, from that version on (to get change notifications via long-poll).
   *  NOTE: This is __not__ related to `options.resourceName`.
   * @param {any} [options.requestOptions] Any remaining properties in the `options` object are
   *  passed down to the raw request as node-fetch options.
   */
  list(
    resourceType,
    { namespaceName, limit, resourceVersion, ...requestOptions } = {}
  ) {
    const url = {
      [apiResourceTypes.NAMESPACE]: resourceType,
      [apiResourceTypes.METAL_CREDENTIAL]: `${apiResourceTypes.NAMESPACE}/${namespaceName}/${resourceType}`,
      [apiResourceTypes.EVENT]: `${apiResourceTypes.NAMESPACE}/${namespaceName}/${resourceType}`,
    };

    const paramStr = buildQueryString({
      limit,
      ...(resourceVersion ? { watch: 1, resourceVersion } : {}),
    });

    return this.request(`${url[resourceType]}${paramStr}`, {
      errorMessage: strings.apiClient.error.failedToGet(resourceType),
      extractBodyMethod: resourceVersion ? 'text' : 'json', // watches respond with multiple JSON documents
      options: {
        // TODO[PRODX-22469]: A timeout helps, but still, we never get content from the body.
        //  We just get a timeout error waiting for body content.
        // timeout: resourceVersion ? 30000 : 0, // milliseconds (0 -> Infinity)
        ...requestOptions,
      },
    });
  }

  create(resourceType, { namespaceName, spec } = {}) {
    const url = {
      [apiResourceTypes.NAMESPACE]: resourceType,
      [apiResourceTypes.METAL_CREDENTIAL]: `${apiResourceTypes.NAMESPACE}/${namespaceName}/${resourceType}`,
    };
    return this.request(url[resourceType], {
      options: { method: 'POST', body: JSON.stringify(spec) },
      expectedStatuses: [201],
      errorMessage: strings.apiClient.error.failedToCreate(
        `${logValue(resourceType)} "${spec.metadata.name}"`
      ),
    });
  }

  delete(resourceType, { namespaceName, name } = {}) {
    const url = {
      [apiResourceTypes.NAMESPACE]: `${resourceType}/${name}`,
      [apiResourceTypes.METAL_CREDENTIAL]: `${apiResourceTypes.NAMESPACE}/${namespaceName}/${resourceType}/${name}`,
    };
    return this.request(url[resourceType], {
      options: { method: 'DELETE' },
      errorMessage: strings.apiClient.error.failedToDelete(
        `${logValue(resourceType)} "${name}"`
      ),
    });
  }
}
