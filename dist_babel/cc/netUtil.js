"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.normalizeUrl = normalizeUrl;
exports.request = request;

var _get2 = _interopRequireDefault(require("lodash/get"));

var _nodeFetch = _interopRequireDefault(require("node-fetch"));

var strings = _interopRequireWildcard(require("../strings"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

async function tryExtractBody(response, extractMethod) {
  let body = null;

  try {
    body = await response[extractMethod]();
  } catch (e) {
    return {
      error: e
    };
  }

  return {
    body
  };
}
/**
 * Split the key into words based on camelcasing or snakecasing.
 * @param {string} key
 * @returns {Array<string>}
 */


function splitOnWords(key) {
  return key.replace(/_/g, ' ').replace(/([a-z])([A-Z][a-zA-Z])/g, '$1 $2');
}
/**
 * Normalize the URL by ensuring it's written in the expected way.
 * @param {string} url
 * @returns {string} Normalized URL.
 */


function normalizeUrl(url) {
  return url.replace(/\/$/, ''); // remove end slash if any
}
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
 * @returns {Object} If successful, the object has this shape:
 *  `{response: Response, expectedStatuses, body: any}`:
 *  - response: The Fetch Response object.
 *  - expectedStatuses: The list provided when the request was initiated.
 *  - body: The result of calling the `extractBodyMethod` on the Fetch Response.
 *    If the method was falsy (other than `undefined`), this value is `null`.
 *
 *  On failure, `{error: string, response: Response|undefined, expectedStatuses}`:
 *  - error: Error message, either `options.errorMessage` if specified, or generated.
 *  - response: The Fetch Response object. Undefined if the failure occurred prior
 *    to fetching data.
 *  - expectedStatuses: The list provided when the request was initiated.
 */


async function request(url, requestOptions, {
  expectedStatuses,
  extractBodyMethod = 'json',
  errorMessage
}) {
  let response = {};

  try {
    response = await (0, _nodeFetch.default)(url, requestOptions);
  } catch (e) {
    return {
      expectedStatuses,
      error: `${errorMessage || strings.netUtil.errors.requestFailed(url)}: ${e.message}`
    };
  }

  if (response.status === 401) {
    return {
      response,
      expectedStatuses,
      error: 'Unauthorized'
    };
  }

  if (expectedStatuses ? !expectedStatuses.includes(response.status) : !response.ok) {
    if (extractBodyMethod) {
      const {
        body
      } = await tryExtractBody(response, extractBodyMethod);
      let message = (0, _get2.default)(body, 'message', '') || (0, _get2.default)(body, 'error_description', '');

      if (message) {
        message = message.includes(': ') ? message.slice(message.indexOf(':') + 2) : message;
      } else {
        message = splitOnWords((0, _get2.default)(body, 'reason', ''));
      }

      if (message) {
        return {
          response,
          expectedStatuses,
          error: `${errorMessage || strings.netUtil.errors.requestFailed(url)}. ` + strings.netUtil.errors.reason(message)
        };
      }
    }

    return {
      response,
      expectedStatuses,
      error: `${errorMessage || strings.netUtil.errors.requestFailed(url)}. ` + (response.statusText ? strings.netUtil.errors.serverResponse(response.statusText) : strings.netUtil.errors.responseCode(response.status))
    };
  }

  let body = null;

  if (extractBodyMethod) {
    const extracted = await tryExtractBody(response, extractBodyMethod);

    if (extracted.error) {
      return {
        response,
        expectedStatuses,
        error: strings.netUtil.errors.invalidResponseData(url)
      };
    }

    body = extracted.body;
  }

  return {
    response,
    expectedStatuses,
    body
  };
}