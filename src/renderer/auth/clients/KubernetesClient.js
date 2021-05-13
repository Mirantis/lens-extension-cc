import { request } from '../../../util/netUtil';
import * as strings from '../../../strings';

/**
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

  list(entity, { namespaceName, entityDescriptionName } = {}) {
    const url = {
      namespace: 'namespaces',
      credential: `namespaces/${namespaceName}/secrets`,
      event: `namespaces/${namespaceName}/events`,
    };
    return this.request(url[entity], {
      errorMessage: strings.apiClient.error.failedToGet(
        entityDescriptionName || entity
      ),
    });
  }

  create(entity, { namespaceName, config, entityDescriptionName } = {}) {
    const url = {
      namespace: 'namespaces',
      credential: `namespaces/${namespaceName}/secrets`,
    };
    return this.request(url[entity], {
      options: { method: 'POST', body: JSON.stringify(config) },
      expectedStatuses: [201],
      errorMessage: strings.apiClient.error.failedToCreate(
        `${entityDescriptionName || entity} "${config.metadata.name}"`
      ),
    });
  }

  delete(entity, { namespaceName, name, entityDescriptionName } = {}) {
    const url = {
      namespace: `namespaces/${name}`,
      credential: `namespaces/${namespaceName}/secrets/${name}`,
    };
    return this.request(url[entity], {
      options: { method: 'DELETE' },
      errorMessage: strings.apiClient.error.failedToDelete(
        `${entityDescriptionName || entity} "${name}"`
      ),
    });
  }
}
