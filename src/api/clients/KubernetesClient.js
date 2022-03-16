import { request } from '../../util/netUtil';
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

  request(url, { options = {}, expectedStatuses = [200], errorMessage }) {
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
      { expectedStatuses, errorMessage }
    );
  }

  list(resourceType, { namespaceName } = {}) {
    const url = {
      [apiResourceTypes.NAMESPACE]: resourceType,
      [apiResourceTypes.METAL_CREDENTIAL]: `${apiResourceTypes.NAMESPACE}/${namespaceName}/${resourceType}`,
      [apiResourceTypes.EVENT]: `${apiResourceTypes.NAMESPACE}/${namespaceName}/${resourceType}`,
    };
    return this.request(url[resourceType], {
      errorMessage: strings.apiClient.error.failedToGet(resourceType),
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
