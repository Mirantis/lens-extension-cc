//
// TODO[metrics]: remove these mocks unless useful for tests
//
// TEMPORARY mock of Prometheus API responses while we wait for
//  the authentication issue to be fixed PRODX-28459
//

import queryString from 'query-string';

/**
 * [ASYNC] Performs a network request using node-fetch (nearly same API as
 *  browser fetch()). See https://www.npmjs.com/package/node-fetch
 *
 * NOTE: This method does not throw errors on any type of failure. It always
 *  succeeds and returns an object.
 *
 * @param {string} url Fetch URL.
 * @param {Object} requestOptions Fetch request options.
 * @param {Object} [options] Additional options.
 * @param {Array<number>} [options.expectedStatuses] If specified, success is based
 *  on the inclusion of the status code in this list; otherwise, it's based on
 *  the 2xx range.
 * @param {string} [options.extractBodyMethod] Name of the method to call on the
 *  Fetch Response object in order to extract/parse the response's data/body.
 *  @see https://developer.mozilla.org/en-US/docs/Web/API/Body for possible values.
 *  If falsy (other than `undefined`), data is not extracted.
 * @param {string} [options.errorMessage] Error message to use if the request is
 *  deemed to have failed (per other options); otherwise, a generated message
 *  is used, based on response status.
 * @returns {Promise<Object>} If successful, the object has this shape:
 *  `{response: Response, expectedStatuses, body: any, url: string}`:
 *  - response: The Fetch Response object.
 *  - expectedStatuses: The list provided when the request was initiated.
 *  - body: The result of calling the `extractBodyMethod` on the Fetch Response.
 *    If the method was falsy (other than `undefined`), this value is `null`.
 *  - url: The full URL used for the request.
 *
 *  On failure, `{error: string, response: Response|undefined, expectedStatuses}`:
 *  - error: Error message, either `options.errorMessage` if specified, or generated.
 *  - response: The Fetch Response object. Undefined if the failure occurred prior
 *    to fetching data.
 *  - expectedStatuses: The list provided when the request was initiated.
 *  - body: If the response was not 200 but it was still possible to extract the
 *    payload using the `extractBodyMethod`, the extracted body. Sometimes APIs
 *    return error messages this way. `undefined` otherwise.
 *
 *  The key distinguishing factor is that `error` will be non-empty in the error case.
 */
export const mockPromRequest = async function (
  url,
  { body },
  { errorMessage, expectedStatuses } = {}
) {
  // cause some delay in the response
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const res = {
    // fetch response object (only what's necessary)
    response: {
      url,
      status: 200,
    },
    url,
    expectedStatuses,
  };

  if (!url.match(/\/api\/v1\/query$/)) {
    res.response.status = 404;
    res.error = errorMessage || 'Not found';
    return res;
  }

  const { query } = queryString.parse(body);

  if (!query) {
    res.response.status = 400;
    res.error = errorMessage || 'Invalid request (missing query)';
    return res;
  }

  let payload;
  switch (query) {
    //// CPU

    case 'avg(rate(node_cpu_seconds_total{mode="idle"}[1m]))':
      payload = {
        status: 'success',
        data: {
          resultType: 'vector',
          result: [
            { metric: {}, value: [1670448022.723, '0.9023333333316258'] },
          ],
        },
      };
      break;

    case 'avg(rate(node_cpu_seconds_total{mode="iowait"}[1m]))':
      payload = {
        status: 'success',
        data: {
          resultType: 'vector',
          result: [
            { metric: {}, value: [1670449938.009, '0.0011527777777764136'] },
          ],
        },
      };
      break;

    case 'avg(rate(node_cpu_seconds_total{mode="system"}[1m]))':
      payload = {
        status: 'success',
        data: {
          resultType: 'vector',
          result: [
            { metric: {}, value: [1670449970.229, '0.017895833333406906'] },
          ],
        },
      };
      break;

    //// MEMORY

    case 'sum(node_memory_MemFree_bytes{job="node-exporter"} + node_memory_Cached_bytes{job="node-exporter"} + node_memory_Buffers_bytes{job="node-exporter"}) + sum(node_memory_SReclaimable_bytes{job="node-exporter"})':
      payload = {
        status: 'success',
        data: {
          resultType: 'vector',
          result: [{ metric: {}, value: [1670450077.822, '51638771712'] }],
        },
      };
      break;

    case 'sum(node_memory_MemTotal_bytes{job="node-exporter"})':
      payload = {
        status: 'success',
        data: {
          resultType: 'vector',
          result: [{ metric: {}, value: [1670450231.048, '97649057792'] }],
        },
      };
      break;

    //// DISK

    case 'sum(node_filesystem_free_bytes)':
      payload = {
        status: 'success',
        data: {
          resultType: 'vector',
          result: [{ metric: {}, value: [1670450993.987, '2739571294208'] }],
        },
      };
      break;

    case 'sum(node_filesystem_size_bytes)':
      payload = {
        status: 'success',
        data: {
          resultType: 'vector',
          result: [{ metric: {}, value: [1670450878.897, '4513795284992'] }],
        },
      };
      break;

    //// UNKNOWN

    default:
      // simulating query syntax error
      // NOTE: response status is still 200 but body has `error` property
      payload = {
        status: 'error',
        errorType: 'bad_data',
        error:
          'invalid parameter "query": 1:30: parse error: unclosed left parenthesis',
      };
      break;
  }

  res.body = payload;
  return res;
};
