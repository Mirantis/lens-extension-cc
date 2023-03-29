import { get } from 'lodash';
import nodeFetch from 'node-fetch';
import https from 'https';
import { Common } from '@k8slens/extensions';
import queryString from 'query-string';
import * as strings from '../strings';

const { Util } = Common;

/**
 * Possible network connection error types.
 * @type {Record<string, string>}
 */
export const netErrorTypes = Object.freeze({
  HOST_NOT_FOUND: 'HostNotFound',
  CERT_VERIFICATION: 'CertificateVerification',
});

/** Agent to use for trusted unsafe HTTPS connections (e.g. self-signed certs) */
const trustedUnsafeAgent = new https.Agent({
  rejectUnauthorized: false,
});

/**
 * Attempts to extract the body of a response.
 * @param {Object} response
 * @param {string} extractMethod Method to call on the response.
 * @returns {Promise<{ body?: any, error?: string }>} If successful, `{ body }`.
 *  If fails, `{ error }`.
 */
async function tryExtractBody(response, extractMethod) {
  try {
    const body = await response[extractMethod]();
    return { body };
  } catch (err) {
    return { error: err.message };
  }
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
export function normalizeUrl(url) {
  return url.replace(/\/$/, ''); // remove end slash if any
}

/**
 * Opens the given URL in the native operating system. Permits only http/s URLs.
 * @param {string} url Must be http/s.
 * @throws {Error} If `url` does not use a permitted protocol: http or https.
 */
export function openBrowser(url) {
  // SECURITY: This addresses CVE-2022-0484 where `openExternal()` provided by
  //  Lens is designed to open _anything_, which means even file: protocols
  //  that would result in local code execution (if MCC URL is spoofed and has
  //  a config.js that provides a file: URL for Keycloak, for example)
  if (!url.match(/^https?:/)) {
    throw new Error(strings.netUtil.error.invalidBrowserUrl(url));
  }

  Util.openExternal(url); // open in default browser
}

/**
 * Builds a query string from given parameters.
 * @param {{ [index: string]: any }} params Values will be cast to a string. Parameters
 *  with `undefined` values will be ignored.
 * @returns {string} Query string that begins with "?" if there is at least one
 *  parameter; empty string if none.
 */
export function buildQueryString(params) {
  const str = queryString.stringify(params);
  return `${str ? '?' : ''}${str}`;
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
 * @param {boolean} [options.trustHost] If truthy, TLS verification of the host
 *  __will be skipped__. If falsy, secure requests will fail if the host's certificate
 *  cannot be verified (typically the case when it's self-signed).
 *
 *  ⚠️ Ignored if `requestionOptions.agent` is specified.
 *
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
export async function request(
  url,
  requestOptions,
  {
    expectedStatuses,
    errorMessage,
    extractBodyMethod = 'json',
    trustHost = false,
  } = {}
) {
  let response = {};

  try {
    response = await nodeFetch(url, {
      // SECURITY: If `trustHost=true`, ignore any certificate issues on the remote host;
      //  otherwise, using `undefined`, the default agent will be used, and if there are
      //  any certificate issues, the request will blocked
      agent:
        url.startsWith('https:') && trustHost ? trustedUnsafeAgent : undefined,

      ...requestOptions,
    });
  } catch (e) {
    return {
      url,
      expectedStatuses,
      error: `${
        errorMessage || strings.netUtil.error.requestFailed(url)
      } ${strings.netUtil.error.reason(e.message)}`,
    };
  }

  if (response.status === 401) {
    return {
      url,
      response,
      expectedStatuses,
      error: strings.netUtil.error.unauthorized(),
    };
  }

  if (
    expectedStatuses
      ? !expectedStatuses.includes(response.status)
      : !response.ok
  ) {
    if (extractBodyMethod) {
      // see if the body has an error message in it that we can use; ignore extraction error, if any
      const { body = {} } = await tryExtractBody(response, extractBodyMethod);

      let message =
        get(body, 'message', '') ||
        get(body, 'error_description', '') ||
        get(body, 'error', '');

      if (message) {
        message = message.includes(': ')
          ? message.slice(message.indexOf(':') + 2)
          : message;
      } else {
        message = splitOnWords(get(body, 'reason', ''));
      }

      if (message) {
        return {
          url,
          response,
          body,
          expectedStatuses,
          error:
            `${errorMessage || strings.netUtil.error.requestFailed(url)} ` +
            strings.netUtil.error.reason(message),
        };
      }
      // else, fall back to generic message
    }
    // else, fall back to generic message

    return {
      url,
      response,
      expectedStatuses,
      error:
        `${errorMessage || strings.netUtil.error.requestFailed(url)} ` +
        (response.statusText
          ? strings.netUtil.error.serverResponse(response.statusText)
          : strings.netUtil.error.responseCode(response.status)),
    };
  }

  let body = null;
  if (extractBodyMethod) {
    const payload = await tryExtractBody(response, extractBodyMethod);
    if (payload.error) {
      return {
        url,
        response,
        expectedStatuses,
        error: strings.netUtil.error.invalidResponseData(url, payload.error),
      };
    }
    body = payload.body;
  }

  return { url, response, expectedStatuses, body };
}

/**
 * Determines if a given error is a known network error.
 * @param {Error|string} error Object or message.
 * @returns {string|undefined} One of `netErrorTypes` enum identifying the type if known;
 *  `undefined` if the error couldn't be identified.
 */
export const getNetErrorType = function (error) {
  const msg = (typeof error === 'string' ? error : error?.message) || '';

  if (
    msg.match(/unable to verify.+certificate/i) ||
    msg.match(/self signed certificate/i)
  ) {
    return netErrorTypes.CERT_VERIFICATION;
  } else if (msg.match(/getaddrinfo.+ENOTFOUND/i)) {
    return netErrorTypes.HOST_NOT_FOUND;
  }

  return undefined;
};
