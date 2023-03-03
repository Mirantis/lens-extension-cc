import { request, buildQueryString } from '../../util/netUtil';
import * as strings from '../../strings';
import { apiResourceTypes } from '../apiConstants';
import { logValue } from '../../util/logger';

export class KubernetesClient {
  static apiPrefix = 'api/v1'; // no start nor end slashes

  /**
   * Used to work with Kubernetes cluster-wide resources (i.e. not in a namespace) resources
   *  such as namespaces.
   * @class KubernetesClient
   * @param {Object} params
   * @param {string} params.baseUrl The MCC base URL (i.e. the URL to the MCC UI). Expected to
   *  be "http[s]://<host>" and to NOT end with a slash.
   * @param {string} params.token Current/valid SSO access token.
   * @param {boolean} [params.trustHost] If truthy, TLS verification of the host
   *  __will be skipped__. If falsy, secure requests will fail if the host's certificate
   *  cannot be verified (typically the case when it's self-signed).
   */
  constructor({ baseUrl, token, trustHost = false }) {
    if (!baseUrl || !token) {
      throw new Error('baseUrl and token are required');
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
   * @param {boolean} [options.trustHost] If truthy, TLS verification of the host
   *  __will be skipped__. If falsy, secure requests will fail if the host's certificate
   *  cannot be verified (typically the case when it's self-signed).
   *
   *  ⚠️ Overrides the client's configured `trustHost` option. Ignored if
   *   `options.options.agent` is specified.
   *
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
      `${this.baseUrl}/${KubernetesClient.apiPrefix}/${endpoint}`,
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

  get() {
    return Promise.resolve({
      error: 'Method "get" not supported on KubernetesClient',
      response: undefined,
      expectedStatuses: [],
      body: undefined,
    });
  }

  /**
   * List resources within a given namespace.
   * @param {string} resourceType
   * @param {Object} options
   * @param {string} options.namespaceName Required.
   * @param {number} [options.limit] To limit the number of items fetched.
   * @param {string} [options.resourceVersion] If specified, establishes a __watch__ on the
   *  __collection__, from that version on (to get change notifications via long-poll).
   *  NOTE: This is __not__ related to a specific resource, but to the collection as a whole.
   * @param {any} [options.requestOptions] Any remaining properties in the `options` object are
   *  passed down to the raw request as node-fetch options.
   * @returns {Promise<Object>} See netUtil.request() for response shape.
   */
  list(
    resourceType,
    { namespaceName, limit, resourceVersion, ...requestOptions } = {}
  ) {
    const url = {
      [apiResourceTypes.NAMESPACE]: resourceType,
      [apiResourceTypes.SECRET]: `${apiResourceTypes.NAMESPACE}/${namespaceName}/${resourceType}`,
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
        ...requestOptions,
      },
    });
  }

  listAll() {
    return Promise.resolve({
      error: 'Method "listAll" not supported on KubernetesClient',
      response: undefined,
      expectedStatuses: [],
      body: undefined,
    });
  }

  /**
   * @param {string} resourceType
   * @param {Object} options
   * @param {string} options.namespaceName Required.
   * @param {Object} options.spec JSON payload.
   */
  create(resourceType, { namespaceName, spec } = {}) {
    const url = {
      [apiResourceTypes.NAMESPACE]: resourceType,
      [apiResourceTypes.SECRET]: `${apiResourceTypes.NAMESPACE}/${namespaceName}/${resourceType}`,
    };
    return this.request(url[resourceType], {
      options: { method: 'POST', body: JSON.stringify(spec) },
      expectedStatuses: [201],
      errorMessage: strings.apiClient.error.failedToCreate(
        `${logValue(resourceType)} "${spec.metadata.name}"`
      ),
    });
  }

  update() {
    return Promise.resolve({
      error: 'Method "update" not supported on KubernetesClient',
      response: undefined,
      expectedStatuses: [],
      body: undefined,
    });
  }

  /**
   * @param {string} resourceType
   * @param {Object} options
   * @param {string} options.namespaceName Required.
   * @param {string} options.resourceName
   */
  delete(resourceType, { namespaceName, resourceName } = {}) {
    const url = {
      [apiResourceTypes.NAMESPACE]: `${resourceType}/${resourceName}`,
      [apiResourceTypes.SECRET]: `${apiResourceTypes.NAMESPACE}/${namespaceName}/${resourceType}/${resourceName}`,
    };
    return this.request(url[resourceType], {
      options: { method: 'DELETE' },
      errorMessage: strings.apiClient.error.failedToDelete(
        `${logValue(resourceType)} "${resourceName}"`
      ),
    });
  }

  reviewRules() {
    return Promise.resolve({
      error: 'Method "reviewRules" not supported on KubernetesClient',
      response: undefined,
      expectedStatuses: [],
      body: undefined,
    });
  }

  nsAccess() {
    return Promise.resolve({
      error: 'Method "nsAccess" not supported on KubernetesClient',
      response: undefined,
      expectedStatuses: [],
      body: undefined,
    });
  }
}
