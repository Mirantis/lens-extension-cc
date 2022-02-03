import { get } from 'lodash';
import nodeFetch from 'node-fetch';
import https from 'https';
import { Common } from '@k8slens/extensions';
import * as strings from '../strings';

const { Util } = Common;

// SECURITY: get around any MCC instance certificate issues
const httpsAgent = DEV_UNSAFE_NO_CERT
  ? new https.Agent({
      rejectUnauthorized: false,
    })
  : undefined;

async function tryExtractBody(response, extractMethod) {
  let body = null;
  try {
    body = await response[extractMethod]();
  } catch (e) {
    return { error: e };
  }
  return { body };
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
export async function request(
  url,
  requestOptions,
  { expectedStatuses, extractBodyMethod = 'json', errorMessage } = {}
) {
  let response = {};

  try {
    response = await nodeFetch(url, {
      ...requestOptions,

      // SECURITY: If DEV_UNSAFE_NO_CERT is `true`, `httpsAgent` will be defined
      //  and it will ignore any certificate issues on the remote server; otherwise,
      //  `httpsAgent1` will be `undefined`, the default agent will be used, and
      //  if there are any certificate issues, the request will blocked
      agent: url.startsWith('https:') ? httpsAgent : undefined,
    });
  } catch (e) {
    return {
      expectedStatuses,
      error: `${errorMessage || strings.netUtil.error.requestFailed(url)}: ${
        e.message
      }`,
    };
  }

  if (response.status === 401) {
    return { response, expectedStatuses, error: 'Unauthorized' };
  }

  if (
    expectedStatuses
      ? !expectedStatuses.includes(response.status)
      : !response.ok
  ) {
    if (extractBodyMethod) {
      const { body } = await tryExtractBody(response, extractBodyMethod);

      let message =
        get(body, 'message', '') || get(body, 'error_description', '');

      if (message) {
        message = message.includes(': ')
          ? message.slice(message.indexOf(':') + 2)
          : message;
      } else {
        message = splitOnWords(get(body, 'reason', ''));
      }

      if (message) {
        return {
          response,
          expectedStatuses,
          error:
            `${errorMessage || strings.netUtil.error.requestFailed(url)}. ` +
            strings.netUtil.error.reason(message),
        };
      }
    }

    return {
      response,
      expectedStatuses,
      error:
        `${errorMessage || strings.netUtil.error.requestFailed(url)}. ` +
        (response.statusText
          ? strings.netUtil.error.serverResponse(response.statusText)
          : strings.netUtil.error.responseCode(response.status)),
    };
  }

  let body = null;
  if (extractBodyMethod) {
    const extracted = await tryExtractBody(response, extractBodyMethod);
    if (extracted.error) {
      return {
        response,
        expectedStatuses,
        error: strings.netUtil.error.invalidResponseData(url),
      };
    }
    body = extracted.body;
  }

  return { response, expectedStatuses, body };
}
