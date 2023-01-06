//
// Functions for making Cloud metric requests via the Prometheus endpoint
//

import queryString from 'query-string';
import { cloudRefresh } from './apiUtil';
import { logger, logValue } from '../util/logger';
// TODO[metrics]: will need `import { request } from '../util/netUtil';` here
import { Cloud } from '../common/Cloud';
import * as strings from '../strings';
import { mockPromRequest } from './__tests__/metricPromMock'; // TODO[metrics]: stop using mocks

/**
 * @typedef PromInstantQueryParams
 * @property {string|number} [time] Time at which metric is sought. Either seconds since
 *  the epoch, or ISO8601 timestamp. Defaults to "now", local time.
 * @property {number} [timeout] Evaluation timeout. Defaults to the query timeout configured
 *  on the server.
 */

/**
 * @private
 * Makes an authenticated request to the Prometheus API using the given Cloud.
 * @param {Object} options
 * @param {Cloud} options.cloud An Cloud object. NOTE: This instance will be UPDATED
 *  with new tokens if the token is expired and successfully refreshed.
 * @param {string} options.promUrl Prometheus URL for the Cloud.
 * @param {string} options.endpoint Subpath from the API endpoint (e.g. method to call, 'query',
 *  'query_range', etc.).
 * @param {Record<string, string>} [options.params] Query parameters.
 * @param {{ expectedStatuses?: Array<number>, extractBodyMethod?: string, errorMessage?: string }} [options.requestOptions]
 *  Options for the `request()` function itself. See JSDocs on that function for more info.
 * @param {Record<string, any>} [options.fetchOptions] Options for the underlying `fetch()` call
 *  that `request()` will make. NOTE: `method` and `body` will be ignored.
 * @returns {Promise<ApiSuccessResponse|ApiErrorResponse>}
 */
const _promRequest = async function ({
  cloud,
  promUrl,
  endpoint,
  params = {},
  requestOptions,
  fetchOptions,
}) {
  if (!cloud || !(cloud instanceof Cloud)) {
    throw new Error('cloud parameter must be a Cloud instance');
  }

  let tokensRefreshed = false;

  // NOTE: it's useless to fetch if we don't have a token, or we can't refresh it
  if (!cloud.connected) {
    return {
      cloud,
      tokensRefreshed,
      error: strings.metricApi.error.noTokens(),
      status: 400,
    };
  }

  const baseUrl = promUrl.replace(/\/$/, ''); // remove end slash if any
  const apiPrefix = 'api/v1';

  const makeRequest = function () {
    // NOTE: since `cloud.token` might get refreshed (and so change), we have to define
    //  the headers everytime we run this internal function
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${cloud.token}`,
    };

    // TODO[metrics]: replace `mockPromRequest` with just request() from '../util/netUtil'
    return mockPromRequest(
      `${baseUrl}/${apiPrefix}/${endpoint}`,
      {
        credentials: 'same-origin',
        ...fetchOptions,
        headers: {
          ...headers,
          ...(fetchOptions?.headers || {}),
        },

        // NOTE: it's not required to put everything in a form URL-encoded body,
        //  but it's best in order to support queries of unknown lengths that might
        //  exceed server-side URL character limits
        method: 'POST',
        body: queryString.stringify(params),
      },
      Object.assign({ expectedStatuses: [200] }, requestOptions)
    );
  };

  // the first attempt to fetch
  let { response, error, body, url } = await makeRequest();
  let path = url?.replace(`${cloud.cloudUrl}/`, '');

  if (response?.status === 401) {
    // assume token is expired, try to refresh
    logger.log(
      'metricApi._cloudRequest()',
      `Request failed (tokens expired); url=${logValue(
        response.url
      )}; cloud=${logValue(cloud.cloudUrl)}`
    );
    tokensRefreshed = await cloudRefresh(cloud);
    if (!tokensRefreshed) {
      return { cloud, tokensRefreshed, url, error, status: 401 };
    }

    // try to fetch again with updated token
    ({ response, error, body, url } = await makeRequest());
    path = url?.replace(`${cloud.cloudUrl}/`, '');
  } else if (!error && body?.status === 'error') {
    // check for Prometheus-reported error
    error = body.error;
  }

  return {
    cloud,
    body,
    tokensRefreshed, // may have been refreshed and _then_ error occurred, so always include
    error,
    status: response?.status ?? 0,
    url,
    path,
  };
};

/**
 * Executes an instance query (one that returns a single metric).
 * @param {Cloud} cloud Cloud object for the mgmt cluster on which Prometheus is available.
 *  NOTE: This instance will be UPDATED with new tokens if the token is expired and successfully
 *  refreshed.
 * @param {string} promUrl Prometheus service URL in the `cloud`.
 * @param {string} query PromQL instant query to execute.
 * @param {PromInstantQueryParams} [params] Query parameters.
 * @returns {Promise<ApiSuccessResponse|ApiErrorResponse>}
 */
export const instantQuery = async function (
  cloud,
  promUrl,
  query,
  params = {}
) {
  const queryParams = Object.assign({ time: Date.now() }, params, { query });
  return _promRequest({
    cloud,
    promUrl,
    endpoint: 'query',
    params: queryParams,
    requestOptions: {
      errorMessage: strings.metricApi.error.instantQueryFailure(),
    },
  });
};

/**
 * Gets all CPU usage metrics.
 * @param {PromInstantQueryParams} [params] Query parameters.
 * @returns {Promise<{ idlePct: number, ioPct: number, systemPct: number, usagePct }>}
 *  Idle, I/O, system, and usage % as a number from 0 to 1.
 */
export const getCpuMetrics = async function (cloud, promUrl, params) {
  const time = Date.now(); // make sure all queries use the same timestamp
  const queryParams = { time, ...params };

  const promises = [
    // idle % (usage is `1 - idle` so we just need to get idle time)
    instantQuery(
      cloud,
      promUrl,
      'avg(rate(node_cpu_seconds_total{mode="idle"}[1m]))',
      queryParams
    ),
    // I/O %
    instantQuery(
      cloud,
      promUrl,
      'avg(rate(node_cpu_seconds_total{mode="iowait"}[1m]))',
      queryParams
    ),
    // system/kernel %
    instantQuery(
      cloud,
      promUrl,
      'avg(rate(node_cpu_seconds_total{mode="system"}[1m]))',
      queryParams
    ),
  ];

  let results;
  try {
    results = await Promise.all(promises);
  } catch (err) {
    throw new Error(`Failed to get cpu usage: ${logValue(err)}`);
  }

  const errors = results.filter((r) => !!r.error);
  if (errors.length > 0) {
    throw new Error(
      `Failed to get cpu usage data due to ${errors.length} errors: [${errors
        .map((e) => logValue(e.error))
        .join(', ')}]`
    );
  }

  const [idleRes, ioRes, systemRes] = results;

  try {
    const stats = {
      idlePct: Number(idleRes.body.data.result[0].value[1]),
      ioPct: Number(ioRes.body.data.result[0].value[1]),
      systemPct: Number(systemRes.body.data.result[0].value[1]),
    };

    return {
      ...stats,
      usagePct: 1 - stats.idlePct,
    };
  } catch (err) {
    throw new Error(`Failed to parse cpu usage data: ${logValue(err)}`);
  }
};

/**
 * Gets all Memory usage metrics.
 * @param {PromInstantQueryParams} [params] Query parameters.
 * @returns {Promise<{ availableByte: number, capacityByte: number, allocatedByte: number }>}
 *  Available, capacity, and allocated memory in bytes.
 */
export const getMemoryMetrics = async function (cloud, promUrl, params) {
  const time = Date.now(); // make sure all queries use the same timestamp
  const queryParams = { time, ...params };

  const promises = [
    // available bytes
    instantQuery(
      cloud,
      promUrl,
      'sum(node_memory_MemFree_bytes{job="node-exporter"} + node_memory_Cached_bytes{job="node-exporter"} + node_memory_Buffers_bytes{job="node-exporter"}) + sum(node_memory_SReclaimable_bytes{job="node-exporter"})',
      queryParams
    ),
    // capacity bytes
    instantQuery(
      cloud,
      promUrl,
      'sum(node_memory_MemTotal_bytes{job="node-exporter"})',
      queryParams
    ),
  ];

  let results;
  try {
    results = await Promise.all(promises);
  } catch (err) {
    throw new Error(`Failed to get memory usage: ${logValue(err)}`);
  }

  const errors = results.filter((r) => !!r.error);
  if (errors.length > 0) {
    throw new Error(
      `Failed to get memory usage data due to ${errors.length} errors: [${errors
        .map((e) => logValue(e.error))
        .join(', ')}]`
    );
  }

  const [availableRes, capacityRes] = results;

  try {
    const stats = {
      availableByte: Number(availableRes.body.data.result[0].value[1]),
      capacityByte: Number(capacityRes.body.data.result[0].value[1]),
    };

    return {
      ...stats,
      allocatedByte: stats.capacityByte - stats.availableByte,
    };
  } catch (err) {
    throw new Error(`Failed to parse memory usage data: ${logValue(err)}`);
  }
};

/**
 * Gets all Disk usage metrics.
 * @param {PromInstantQueryParams} [params] Query parameters.
 * @returns {Promise<{ availableByte: number, capacityByte: number, usedByte: number }>}
 *  Available, capacity, and used storage in bytes.
 */
export const getDiskMetrics = async function (cloud, promUrl, params) {
  const time = Date.now(); // make sure all queries use the same timestamp
  const queryParams = { time, ...params };

  const promises = [
    // available bytes
    instantQuery(
      cloud,
      promUrl,
      'sum(node_filesystem_free_bytes)',
      queryParams
    ),
    // capacity bytes
    instantQuery(
      cloud,
      promUrl,
      'sum(node_filesystem_size_bytes)',
      queryParams
    ),
  ];

  let results;
  try {
    results = await Promise.all(promises);
  } catch (err) {
    throw new Error(`Failed to get disk usage: ${logValue(err)}`);
  }

  const errors = results.filter((r) => !!r.error);
  if (errors.length > 0) {
    throw new Error(
      `Failed to get disk usage data due to ${errors.length} errors: [${errors
        .map((e) => logValue(e.error))
        .join(', ')}]`
    );
  }

  const [availableRes, capacityRes] = results;

  try {
    const stats = {
      availableByte: Number(availableRes.body.data.result[0].value[1]),
      capacityByte: Number(capacityRes.body.data.result[0].value[1]),
    };

    return {
      ...stats,
      usedByte: stats.capacityByte - stats.availableByte,
    };
  } catch (err) {
    throw new Error(`Failed to parse disk usage data: ${logValue(err)}`);
  }
};
