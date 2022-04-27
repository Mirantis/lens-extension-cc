import * as rtv from 'rtvjs';
import { Cloud, CLOUD_EVENTS } from './Cloud';
import { filter } from 'lodash';
import AbortController from 'abort-controller'; // TODO[PRODX-22469]: Remove package if we drop watches.
import { cloudRequest, extractJwtPayload } from '../api/apiUtil';
import { Namespace } from '../api/types/Namespace';
import { Credential } from '../api/types/Credential';
import { SshKey } from '../api/types/SshKey';
import { Cluster } from '../api/types/Cluster';
import { Machine } from '../api/types/Machine';
import { Proxy } from '../api/types/Proxy';
import { License } from '../api/types/License';
import { logger, logValue } from '../util/logger';
import { EventDispatcher } from './EventDispatcher';
import {
  apiResourceTypes,
  apiCredentialTypes,
  apiChangeTypes,
} from '../api/apiConstants';
import * as strings from '../strings';

// TODO[PRODX-22469]: Remove if we drop watches.
/**
 * @typedef {Object} ApiWatch
 * @property {Cloud} cloud Cloud used to fetch the data.
 * @property {string} resourceType API resource type from `apiResourceTypes` enum.
 * @property {string} resourceVersion Version of the collection that was retrieved, from
 *  which to start watching.
 * @property {Namespace} [namespace] Defined only if resource type isn't NAMESPACE
 * @property {{ [index: string]: any }} [args] Additional args used to fetch the data.
 * @property {Function} [run] If the watch is active, reference to the runner. Called
 *  once to initiate the watch, and runs forever until aborted.
 * @property {AbortController} [controller] If the watch is active, the controller used
 *  to abort the watch if necessary.
 */

// TODO[PRODX-22469]: Remove if we drop watches.
/**
 * Shape (Typeset) for a `watch` object returned by `_fetchCollection()`.
 */
const apiWatchTs = {
  cloud: [rtv.CLASS_OBJECT, { ctor: Cloud }],
  resourceType: [rtv.STRING, { exact: Object.values(apiResourceTypes) }],
  resourceVersion: rtv.STRING,
  namespace: [rtv.OPTIONAL, rtv.CLASS_OBJECT, { ctor: Namespace }],
  run: [rtv.OPTIONAL, rtv.FUNCTION],
  controller: [rtv.OPTIONAL, rtv.CLASS_OBJECT, { ctor: AbortController }],
};

// TODO[PRODX-22469]: Remove if we drop watches.
/**
 * Map of resource type to Resource class constructor.
 * @type { [index: string]: function }
 */
const resourceConstructors = {
  [apiResourceTypes.NAMESPACE]: Namespace,
  [apiResourceTypes.MACHINE]: Machine,
  [apiResourceTypes.CLUSTER]: Cluster,
  [apiResourceTypes.PUBLIC_KEY]: SshKey,
  [apiResourceTypes.RHEL_LICENSE]: License,
  [apiResourceTypes.PROXY]: Proxy,
  ...Object.values(apiCredentialTypes).reduce((acc, type) => {
    acc[type] = Credential;
    return acc;
  }, {}),
};

// TODO[PRODX-22469]: Remove if we drop watches.
/**
 * Map of resource type to Namespace list property name.
 * @type { [index: string]: string }
 */
const resourceToNamespaceProp = {
  [apiResourceTypes.MACHINE]: 'machines',
  [apiResourceTypes.CLUSTER]: 'clusters',
  [apiResourceTypes.PUBLIC_KEY]: 'sshKeys',
  [apiResourceTypes.RHEL_LICENSE]: 'licenses',
  [apiResourceTypes.PROXY]: 'proxies',
  ...Object.values(apiCredentialTypes).reduce((acc, type) => {
    acc[type] = 'credentials';
    return acc;
  }, {}),
};

export const DATA_CLOUD_EVENTS = Object.freeze({
  /**
   * Initial data load (fetch) only, either starting or finished.
   *
   * Expected signature: `(event: { name: string, target: DataCloud }) => void`
   *
   * - `name`: event name
   */
  LOADED: 'loaded',

  /**
   * Whenever new data is being fetched, or done fetching (even on the initial
   *  data load, which means there's overlap with the `LOADED` event).
   *
   * Expected signature: `(event: { name: string, target: DataCloud }) => void`
   */
  FETCHING_CHANGE: 'fetchingChange',

  /**
   * When new data will be fetched.
   *
   * Expected signature: `(event: { name: string, target: DataCloud }) => void`
   */
  FETCH_DATA: 'fetchData',

  /**
   * Whenever the `error` property changes.
   *
   * Expected signature: `(event: { name: string, target: DataCloud }) => void`
   */
  ERROR_CHANGE: 'errorChange',

  /**
   * When any data-related property (e.g. `namespaces`) has been updated.
   *
   * Expected signature: `(event: { name: string, target: DataCloud }) => void`
   */
  DATA_UPDATED: 'dataUpdated',

  // TODO[PRODX-22469]: Remove if we drop watches.
  /**
   * When one or more API Resources fetched by this DataCloud has been updated
   *  (added, modified, or deleted).
   *
   * Expected signature: `(event: { name: string, target: DataCloud }, info: { updates: Array<{ type: "ADDED"|"MODIFIED"|"DELETED", resource: Resource }> }) => void`
   *
   * - `info.updates`: List of changes to resources that have taken place.
   */
  RESOURCE_UPDATED: 'resourceUpdated',
});

/**
 * Milliseconds at which new data will be fetched from the Cloud.
 *
 * __AVOID__ exactly 5 minutes because API tokens expire after 5 minutes and need to be
 *  refreshed. This will still work, but because we execute many parallel requests when
 *  fetching data (e.g. for each namespace synced, multiple types of credentials), it'll
 *  cause a lot of churn because each one of those will trigger a token refresh.
 *
 * Since fetching starts with getting all namespaces, and this is a single request, we
 *  set this interval such that it's most likely this will be the request that causes
 *  tokens to be refreshed, and then subsequent requests for remaining data (clusters,
 *  SSH keys, etc.) will proceed with new, valid tokens.
 */
const FETCH_INTERVAL = 4.85 * 60 * 1000; // 4:51 minutes (AVOID exactly 5 minutes)

/**
 * Quick interval (ms) to use when an error has happened and any fetched data cannot be trusted.
 *  The follow-up interval should be much quicker than the normal interval after a successful
 *  fetch.
 */
const FETCH_INTERVAL_QUICK = 30 * 1000;

/**
 * Gets the error message from an error, or returns the error as-is if it's already a string.
 * @param {Error|string} error
 * @returns {string|null} Error message. Either `error.message` or `error` itself; null if
 *  `error` is falsy.
 */
const getErrorMessage = (error) => {
  if (!error) {
    return null;
  }
  if (typeof error === 'string') {
    return error;
  }
  return error.message;
};

/**
 * Deserialize a raw list of API resources into `Resource` instances.
 * @param {string} resourceType API resourceType name to fetch from the `apiConstants.apiResourceTypes` enum.
 * @param {Object} body Data response from `/list/{resourceType}` API.
 * @param {Namespace} [namespace] The related Namespace; `undefined` if fetching
 *  namespaces themselves (i.e. `resourceType === apiResourceTypes.NAMESPACE`).
 * @param {(params: { data: Object, namespace?: Namespace }) => Resource} params.create Function
 *  called to create new instance of an `Resource`-based class that represents the API resourceType.
 *  - `data` is the raw object returned from the API for the resourceType
 *  - `namespace` is the related Namespace (`undefined` when fetching namespaces themselves
 *      with `resourceType === apiResourceTypes.NAMESPACE`)
 * @returns {Array<Resource>} Array of API objects. Empty list if none. Any
 *  item that can't be deserialized is ignored and not returned in the list.
 */
const _deserializeCollection = function (
  resourceType,
  body,
  namespace,
  create
) {
  if (!body || !Array.isArray(body.items)) {
    logger.error(
      'DataCloud._deserializeCollection()',
      `Failed to parse "${resourceType}" collection payload: Unexpected data format`
    );
    return [];
  }

  return body.items
    .map((data, idx) => {
      try {
        return create({ data, namespace });
      } catch (err) {
        logger.warn(
          'DataCloud._deserializeCollection()',
          `Ignoring "${resourceType}" resource type ${idx}${
            namespace ? ` from namespace=${logValue(namespace.name)}` : ''
          }: Could not be deserialized, error="${getErrorMessage(err)}"`,
          err
        );
        return undefined;
      }
    })
    .filter((obj) => !!obj);
};

// TODO[PRODX-22469]: No need to return `watches` from any of the _fetch*() methods if we're dropping watches.

/**
 * [ASYNC] Best-try to get all existing resources of a given type from the management cluster,
 *  for each namespace specified.
 * @param {Object} params
 * @param {string} params.resourceType API resource type to fetch (one of
 *  `apiConstants.apiResourceTypes` enum values).
 * @param {Cloud} params.cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} [params.namespaces] List of namespaces in which to get the resources.
 *  __REQUIRED__ unless `resourceType === apiResourceTypes.NAMESPACE`, in which case this parameter is
 *  ignored because we're fetching the namespaces themselves.
 * @param {(params: { data: Object, namespace?: Namespace }) => Resource} params.create Function
 *  called to create new instance of an `Resource`-based class that represents the API resourceType.
 *  - `data` is the raw object returned from the API for the resourceType
 *  - `namespace` is the related Namespace (`undefined` when fetching namespaces themselves
 *      with `resourceType === apiResourceTypes.NAMESPACE`)
 * @param {Object} [params.args] Custom arguments to provide to the `args` param of `cloudRequest()`.
 *
 *  NOTE: `namespaceName` arg, if specified, will be overwritten by the namespace whose resources
 *   are being fetched.
 *
 * @returns {Promise<{
 *   resources: { [index: string]: Array<Resource> },
 *   watches: Array<ApiWatch>,
 *   tokensRefreshed: boolean,
 *   errors?: { [index: string]: { message: string, status: number, resourceType: string } }
 * }>} Always resolves, never fails.
 *
 *  - `resources` is a map of namespace name to list of `Resource`-based instances as returned
 *      by `create()`. If an error occurs trying to get an resourceType or deserialize
 *      it, it is ignored/skipped.
 *  - `watches` is an array of details for launching subsequent Kube API watches to get notified
 *      (via long-polls) of changes to resource collections accessed while retrieving the
 *      `resources`. See https://kubernetes.io/docs/reference/using-api/api-concepts/#efficient-detection-of-changes
 *      for more on the watch API. `namespace` is only defined if the `resourceType` is NOT
 *      `apiResourceTypes.NAMESPACE`, and `resourceVersion` is defined if a collection version
 *      was retrieved from the fetch request. Each object will match the `apiWatchTs` Typeset
 *  - `tokensRefreshed` is true if the Cloud's API access tokens had to be refreshed while getting
 *      the `resources`.
 *  - `errors` is defined if a at least one error occurred while fetching a collection, and is a
 *      map of namespace name to error object.
 *
 *  NOTE: If `resourceType === apiResourceTypes.NAMESPACE` (i.e. fetching namespaces themselves),
 *   `resources` and `errors` are maps with a single key which is the `apiResourceTypes.NAMESPACE`
 *   type mapped to resources and errors, respectively.
 */
const _fetchCollection = async function ({
  resourceType,
  cloud,
  namespaces,
  create,
  args,
}) {
  DEV_ENV &&
    rtv.verify(
      { resourceType, namespaces },
      {
        resourceType: [rtv.STRING, { oneOf: Object.values(apiResourceTypes) }],
        namespaces: [rtv.OPTIONAL, [rtv.CLASS_OBJECT, { ctor: Namespace }]],
      }
    );

  if (!cloud.config.isResourceAvailable(resourceType)) {
    logger.log(
      'DataCloud._fetchCollection',
      `Cannot fetch resources of type ${logValue(
        resourceType
      )}: Not available; cloud=${logValue(cloud.cloudUrl)}`
    );
    return { resources: {}, watches: [], tokensRefreshed: false };
  }

  let tokensRefreshed = false;

  // process a result from an API call
  // NOTE: `namespace` is `undefined` when fetching namespaces themselves
  const processResult = (
    { body, tokensRefreshed: refreshed, error, status },
    namespace
  ) => {
    tokensRefreshed = tokensRefreshed || refreshed;

    let items = [];
    if (error) {
      // if it's a 403 "access denied" issue, just log it but don't flag it
      //  as an error since there are various mechanisms that could prevent
      //  a user from accessing certain resources in the API (disabled components,
      //  permissions, etc.)
      logger[status === 403 ? 'log' : 'error'](
        'DataCloud._fetchCollection',
        `${
          status === 403 ? '(IGNORED: Access denied) ' : ''
        }Failed to get "${resourceType}" resources, namespace=${
          logValue(namespace?.name || namespace) // undefined if `resourceType === apiResourceTypes.NAMESPACE`
        }, status=${status}, error="${getErrorMessage(error)}"`
      );
      if (status === 403) {
        error = undefined; // ignore
      }
    } else {
      items = _deserializeCollection(resourceType, body, namespace, create);
    }

    return {
      items,
      namespace,
      resourceVersion: body?.metadata?.resourceVersion || null, // collection version
      error: error
        ? { message: getErrorMessage(error), status, resourceType }
        : undefined,
    };
  };

  let watches = [];
  let results;
  if (resourceType === apiResourceTypes.NAMESPACE) {
    watches.push({
      cloud,
      resourceType: apiResourceTypes.NAMESPACE,
      args,
    });

    const result = await cloudRequest({
      cloud,
      method: 'list',
      resourceType: apiResourceTypes.NAMESPACE,
      args,
    });

    results = [processResult(result)];
  } else {
    results = await Promise.all(
      namespaces.map(async (namespace) => {
        watches.push({
          cloud,
          resourceType,
          namespace,
          args,
        });

        const result = await cloudRequest({
          cloud,
          method: 'list',
          resourceType,
          args: { ...args, namespaceName: namespace.name },
        });

        return processResult(result, namespace);
      })
    );
  }

  // NOTE: the loop above ensures that there are no error results; all items in
  //  `results` have the same shape

  const resources = {};
  let errors = {};
  if (resourceType === apiResourceTypes.NAMESPACE) {
    resources[apiResourceTypes.NAMESPACE] = results[0].items;
    watches[0].resourceVersion = results[0].resourceVersion;
    if (results[0].error) {
      errors[apiResourceTypes.NAMESPACE] = results[0].error;
    }
  } else {
    results.forEach((result, idx) => {
      const {
        namespace: { name: nsName },
        items,
        error,
      } = result;
      resources[nsName] = items;
      watches[idx].resourceVersion = result.resourceVersion;
      if (error) {
        errors[nsName] = error;
      }
    });
  }

  if (Object.keys(errors).length <= 0) {
    errors = undefined;
  }

  // remove any watches that didn't get a resource version (which means there was likely
  //  an error getting or parsing the results and we didn't get the collection, so we didn't
  //  get a resource version to watch for changes)
  watches = watches.filter((w) => !!w.resourceVersion);

  return { resources, watches, tokensRefreshed, errors };
};

/**
 * [ASYNC] Best-try to get all existing Credentials from the management cluster, for each
 *  namespace specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 * @returns {Promise<{
 *   credentials: { [index: string]: Array<Credential|Object> },
 *   watches: Array<ApiWatch>,
 *   tokensRefreshed: boolean,
 *   errorsOccurred: number,
 * }>} Always resolves, never fails.
 *
 *  - `credentials` is a map of namespace name to credential (regardless of type).
 *      If there's an error trying to get any credential, it will be skipped/ignored.
 *  - `errorsOccurred` is true if at least one error ocurred (that couldn't be safely ignored)
 *      while fetching resources.
 */
const _fetchCredentials = async function (cloud, namespaces) {
  const results = await Promise.all(
    Object.values(apiCredentialTypes).map((resourceType) =>
      _fetchCollection({
        resourceType,
        cloud,
        namespaces,
        create: ({ data, namespace }) => {
          return new Credential({ data, namespace, cloud });
        },
      })
    )
  );

  // NOTE: `results` will be an array of `{ resources, tokensRefreshed, errors }` because
  //  of each credential type that was retrieved for each namespace
  // NOTE: _fetchCollection() ensures there are no error results (though errors may be
  //  reported in results); all items in `results` have the same shape

  let watches = [];
  let tokensRefreshed = false;
  let errorsOccurred = false;
  const credentials = results.reduce((acc, result) => {
    const {
      resources,
      watches: resultWatches,
      tokensRefreshed: refreshed,
      errors,
    } = result;

    tokensRefreshed = tokensRefreshed || refreshed;
    errorsOccurred = errorsOccurred || !!errors;
    watches = [...watches, ...resultWatches];

    Object.keys(resources).forEach((nsName) => {
      const creds = resources[nsName];
      if (acc[nsName]) {
        acc[nsName] = [...acc[nsName], ...creds];
      } else {
        acc[nsName] = [...creds];
      }
    });

    return acc;
  }, {});

  return { credentials, watches, tokensRefreshed, errorsOccurred };
};

/**
 * [ASYNC] Best-try to get all existing licenses from the management cluster, for each
 *  namespace specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 * @returns {Promise<{
 *   licenses: { [index: string]: Array<License> },
 *   watches: Array<ApiWatch>,
 *   tokensRefreshed: boolean,
 *   errorsOccurred: boolean,
 * }>} Always resolves, never fails.
 *
 *  - `licenses` are mapped per namespace name. If an error occurs trying to get
 *      any license, it will be ignored/skipped.
 *  - `errorsOccurred` is true if at least one error ocurred (that couldn't be safely ignored)
 *      while fetching resources.
 */
const _fetchLicenses = async function (cloud, namespaces) {
  const {
    resources: licenses,
    watches,
    tokensRefreshed,
    errors,
  } = await _fetchCollection({
    resourceType: apiResourceTypes.RHEL_LICENSE,
    cloud,
    namespaces,
    create: ({ data, namespace }) => new License({ data, namespace, cloud }),
  });

  return { licenses, watches, tokensRefreshed, errorsOccurred: !!errors };
};

/**
 * [ASYNC] Best-try to get all existing proxies from the management cluster, for each
 *  namespace specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 * @returns {Promise<{
 *   proxies: { [index: string]: Array<Proxy> },
 *   watches: Array<ApiWatch>,
 *   tokensRefreshed: boolean,
 *   errorsOccurred: boolean,
 * }>} Always resolves, never fails.
 *
 *  - `proxies` are mapped per namespace name. If an error occurs trying to get
 *      any proxy, it will be ignored/skipped.
 *  - `errorsOccurred` is true if at least one error ocurred (that couldn't be safely ignored)
 *      while fetching resources.
 */
const _fetchProxies = async function (cloud, namespaces) {
  const {
    resources: proxies,
    watches,
    tokensRefreshed,
    errors,
  } = await _fetchCollection({
    resourceType: apiResourceTypes.PROXY,
    cloud,
    namespaces,
    create: ({ data, namespace }) => new Proxy({ data, namespace, cloud }),
  });

  return { proxies, watches, tokensRefreshed, errorsOccurred: !!errors };
};

/**
 * [ASYNC] Best-try to get all existing SSH keys from the management cluster, for each
 *  namespace specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 * @returns {Promise<{
 *   sshKeys: { [index: string]: Array<SshKey|Object> },
 *   watches: Array<ApiWatch>,
 *   tokensRefreshed: boolean,
 *   errorsOccurred: boolean,
 * }>} Always resolves, never fails.
 *
 *  - `sshKeys` are mapped per namespace name. If an error occurs trying
 *      to get any SSH key, it will be ignored/skipped.
 *  - `errorsOccurred` is true if at least one error ocurred (that couldn't be safely ignored)
 *      while fetching resources.
 */
const _fetchSshKeys = async function (cloud, namespaces) {
  const {
    resources: sshKeys,
    watches,
    tokensRefreshed,
    errors,
  } = await _fetchCollection({
    resourceType: apiResourceTypes.PUBLIC_KEY,
    cloud,
    namespaces,
    create: ({ data, namespace }) => {
      return new SshKey({ data, namespace, cloud });
    },
  });

  return { sshKeys, watches, tokensRefreshed, errorsOccurred: !!errors };
};

/**
 * [ASYNC] Best-try to get all existing Machines from the management cluster, for each
 *  namespace specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 * @returns {Promise<{
 *   machines: { [index: string]: Array<Machine> },
 *   watches: Array<ApiWatch>,
 *   tokensRefreshed: boolean,
 *   errorsOccurred: boolean,
 * }>} Always resolves, never fails.
 *
 *  - `machines` are mapped per namespace name. If an error occurs trying to get
 *      any Machine, it will be ignored/skipped.
 *  - `errorsOccurred` is true if at least one error ocurred (that couldn't be safely ignored)
 *      while fetching resources.
 */
const _fetchMachines = async function (cloud, namespaces) {
  const {
    resources: machines,
    watches,
    tokensRefreshed,
    errors,
  } = await _fetchCollection({
    resourceType: apiResourceTypes.MACHINE,
    cloud,
    namespaces,
    create: ({ data, namespace }) => new Machine({ data, namespace, cloud }),
  });

  return { machines, watches, tokensRefreshed, errorsOccurred: !!errors };
};

/**
 * [ASYNC] Best-try to get all existing clusters from the management cluster, for each
 *  namespace specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 *
 *  NOTE: Each namespace is expected to already contain all known Credentials,
 *   SSH Keys, Proxies, Machines, and Licenses that this Cluster might reference.
 *
 * @returns {Promise<{
 *   clusters: { [index: string]: Array<Cluster|Object> },
 *   watches: Array<ApiWatch>,
 *   tokensRefreshed: boolean,
 *   errorsOccurred: boolean,
 * }>} Always resolves, never fails.
 *
 *  - `clusters` are mapped per namespace name. If an error occurs trying to get
 *      any cluster, it will be ignored/skipped.
 *  - `errorsOccurred` is true if at least one error ocurred (that couldn't be safely ignored)
 *      while fetching resources.
 */
const _fetchClusters = async function (cloud, namespaces) {
  const {
    resources: clusters,
    watches,
    tokensRefreshed,
    errors,
  } = await _fetchCollection({
    resourceType: apiResourceTypes.CLUSTER,
    cloud,
    namespaces,
    create: ({ data, namespace }) => {
      return new Cluster({ data, namespace, cloud });
    },
  });

  return { clusters, watches, tokensRefreshed, errorsOccurred: !!errors };
};

/**
 * [ASYNC] Best-try to get all existing namespaces from the management cluster.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {boolean} [preview] True to create a preview version of the Namespace.
 * @returns {Promise<{
 *   namespaces: Array<Namespace>,
 *   tokensRefreshed: boolean,
 *   preview: boolean,
 *   error?: { message: string, status: number, resourceType: string },
 * }>} Never fails, always resolves. If an error occurs trying to get any namespace, it will
 *  be ignored/skipped and then included in the `errors` property.
 */
const _fetchNamespaces = async function (cloud, preview = false) {
  // NOTE: we always fetch ALL known namespaces because when we display metadata
  //  about this DataCloud, we always need to show the actual total, not just
  //  what we're syncing
  const {
    resources: { [apiResourceTypes.NAMESPACE]: namespaces },
    watches,
    tokensRefreshed,
    errors,
  } = await _fetchCollection({
    resourceType: apiResourceTypes.NAMESPACE,
    cloud,
    create: ({ data }) => new Namespace({ data, cloud, preview }),
  });

  const userRoles = extractJwtPayload(cloud.token).iam_roles || [];

  const hasReadPermissions = (name) =>
    userRoles.includes(`m:kaas:${name}@reader`) ||
    userRoles.includes(`m:kaas:${name}@writer`) ||
    userRoles.includes(`m:kaas:${name}@user`) ||
    userRoles.includes(`m:kaas:${name}@operator`) ||
    userRoles.includes('m:kaas@global-admin');

  const ignoredNamespaces = cloud?.config?.ignoredNamespaces || [];

  return {
    namespaces: filter(
      namespaces,
      (ns) =>
        !ignoredNamespaces.includes(ns.name) && hasReadPermissions(ns.name)
    ),
    watches,
    tokensRefreshed,
    error: errors?.[apiResourceTypes.NAMESPACE],
  };
};

//
// DATACLOUD CLASS
//

/**
 * Performs scheduled and on-demand data fetching of a given Cloud.
 * @class DataCloud
 */
export class DataCloud extends EventDispatcher {
  /**
   * @constructor
   * @param {Cloud} cloud The Cloud that provides backing for the DataCloud to access
   *  the API and determines which namespaces are synced.
   * @param {boolean} [preview] If truthy, declares this instance is only for preview
   *  purposes (i.e. not used for actual sync to the Catalog), which reduces the amount
   *  of data fetched from the Cloud in order to make data fetching much faster.
   */
  constructor(cloud, preview) {
    super();

    let _loaded = false; // true if we've fetched data at least once, successfully
    let _fetching = false; // anytime we're fetching new data
    let _watches = [];
    let _namespaces = [];
    let _cloud = null; // starts null, but once set, can never be null/undefined again
    let _error = null;

    /**
     * @readonly
     * @member {Cloud} cloud The Cloud instance providing data.
     */
    Object.defineProperty(this, 'cloud', {
      enumerable: true,
      get() {
        return _cloud;
      },
      set(newValue) {
        DEV_ENV &&
          rtv.verify(
            { cloud: newValue },
            { cloud: [rtv.CLASS_OBJECT, { ctor: Cloud }] } // required, cannot be undefined/null
          );

        if (
          newValue !== _cloud &&
          (!_cloud || _cloud.cloudUrl === newValue.cloudUrl)
        ) {
          if (_cloud) {
            // stop listening to the OLD Cloud
            _cloud.removeEventListener(
              CLOUD_EVENTS.SYNC_CHANGE,
              this.onCloudSyncChange
            );
          }

          _cloud = newValue;

          // sync the new Cloud with this DC's loaded/fetching state since even though
          //  it's a new Cloud class instance, it's still the same URL and so the same
          //  mgmt cluster, and do the data that we have already (if any) should still
          //  be valid (we just got a new class instance from the CloudStore for "reasons")
          _cloud.loaded = this.loaded;
          _cloud.fetching = this.fetching;

          _cloud.addEventListener(
            CLOUD_EVENTS.SYNC_CHANGE,
            this.onCloudSyncChange
          );

          logger.log(
            'DataCloud.cloud:set',
            `Received new Cloud: Fetching new data now; dataCloud=${this}`
          );
          this.fetchNow();
        } else if (_cloud && _cloud.cloudUrl !== newValue.cloudUrl) {
          logger.error(
            'DataCloud.cloud:set',
            `Rejected new Cloud with different URL; newCloud=${newValue}, dataCloud=${this}`
          );
        }
      },
    });

    /**
     * @member {boolean} loaded True if we have __successfully__ fetched Cloud data at least once;
     *  false otherwise.
     * @see {@link DataCloud.loading}
     */
    Object.defineProperty(this, 'loaded', {
      enumerable: true,
      get() {
        return _loaded;
      },
      set(newValue) {
        // only change it once from false -> true because we only load once; after that, we fetch
        if (!_loaded && !!newValue) {
          _loaded = true;
          this.cloud.loaded = _loaded;
          this.dispatchEvent(DATA_CLOUD_EVENTS.LOADED);
        }
      },
    });

    /**
     * @member {boolean} fetching True if we're currently fetching new data from the Cloud,
     *  whether it's the first time or any subsequent time.
     */
    Object.defineProperty(this, 'fetching', {
      enumerable: true,
      get() {
        return _fetching;
      },
      set(newValue) {
        if (!!newValue !== _fetching) {
          _fetching = !!newValue;
          this.cloud.fetching = _fetching;
          this.dispatchEvent(DATA_CLOUD_EVENTS.FETCHING_CHANGE);
        }
      },
    });

    // TODO[PRODX-22469]: Remove if we drop watches.
    /**
     * @member {Array<ApiWatch>} watches List of active API watches if we're currently watching
     *  API endpoints for changes; empty if we're doing full data fetches at a set interval.
     */
    Object.defineProperty(this, 'watches', {
      enumerable: true,
      get() {
        return _watches;
      },
      set(newValue) {
        if (newValue !== _watches) {
          DEV_ENV &&
            rtv.verify({ watches: newValue }, { watches: [[apiWatchTs]] });
          _watches = newValue;
        }
      },
    });

    /**
     * @member {Array<Namespace>} namespaces __ALL__ namespaces in the Cloud, regardless
     *  of which specific ones the Cloud may be syncing. Empty if never fetched. Empty if none.
     *  Use `DataCloud.loaded` to know if namespaces have been successfully fetched at least
     *  once.
     * @see {@link syncedNamespaces}
     * @see {@link loaded}
     */
    Object.defineProperty(this, 'namespaces', {
      enumerable: true,
      get() {
        return _namespaces;
      },
      set(newValue) {
        if (newValue !== _namespaces) {
          // must be an array (could be empty) of Namespace objects
          DEV_ENV &&
            rtv.verify(
              { namespaces: newValue },
              { namespaces: [[rtv.CLASS_OBJECT, { ctor: Namespace }]] }
            );
          _namespaces = newValue;
          this.dispatchEvent(DATA_CLOUD_EVENTS.DATA_UPDATED);
        }
      },
    });

    /**
     * @member {string|null} error The error encountered during the most recent data fetch.
     *  `null` if none.
     */
    Object.defineProperty(this, 'error', {
      enumerable: true,
      get() {
        return _error;
      },
      set(newValue) {
        if (newValue !== _error) {
          _error = newValue || null;
          this.dispatchEvent(DATA_CLOUD_EVENTS.ERROR_CHANGE);
        }
      },
    });

    /**
     * @member {boolean} preview True if this instance is for previous purposes
     *  only; false if it's for full use. Use a preview instance when not using
     *  it for sync purposes to reduce the amount of data fetched.
     */
    Object.defineProperty(this, 'preview', {
      enumerable: true,
      get() {
        return !!preview;
      },
    });

    /**
     * @member {null|TimerID} _updateInterval Data fetch interval timer ID; null if
     *  not active.
     * @private
     */
    Object.defineProperty(this, '_updateInterval', {
      writable: true,
      value: null,
    });

    //// initialize

    this.cloud = cloud;

    // since we assign properties when initializing, and this may cause some events
    //  to get dispatched, make sure we start with a clean slate for any listeners
    //  that get added to this new instance we just constructed
    this.emptyEventQueue();

    // listen to our own event to fetch new data; this allows us to de-duplicate calls
    //  to fetchData() when the Cloud's properties get updated multiple times in
    //  succession because of CloudStore updates or expired tokens that got refreshed
    this.addEventListener(DATA_CLOUD_EVENTS.FETCH_DATA, this.onFetchData);

    // schedule the initial data load/fetch, afterwhich we'll either start watching or polling
    this.dispatchEvent(DATA_CLOUD_EVENTS.FETCH_DATA);
  }

  //
  // CONVENIENCE GETTERS
  //

  /**
   * @readonly
   * @member {string} cloudUrl URL of the backing/wrapped Cloud object.
   */
  get cloudUrl() {
    return this.cloud.cloudUrl;
  }

  /**
   * @readonly
   * @member {boolean} loading True if we're loading/fetching Cloud data for the __first__ time;
   *  false otherwise.
   * @see {@link DataCloud.fetching}
   */
  get loading() {
    return !this.loaded && this.fetching;
  }

  // TODO[PRODX-22469]: Remove if we drop watches.
  /**
   * @readonly
   * @member {boolean} watching True if we're actively watching the API for changes; false
   *  if we're only doing full data fetches at a set interval.
   */
  get watching() {
    return this.watches.length > 0;
  }

  /**
   * @readonly
   * @member {boolean} polling True if polling interval is active.
   */
  get polling() {
    return !!this._updateInterval;
  }

  /**
   * @readonly
   * @member {Array<Namespace>} syncedNamespaces List of namespaces the Cloud is syncing;
   *  empty if none or the namespaces haven't been successfully fetched at least once yet.
   */
  get syncedNamespaces() {
    return this.cloud.syncedProjects.map((name) =>
      this.namespaces.find(({ name: nsName }) => name === nsName)
    );
  }

  /**
   * @readonly
   * @member {Array<Namespace>} ignoredNamespaces List of namespaces the Cloud is not syncing;
   *  empty if none or the namespaces haven't been successfully fetched at least once yet.
   */
  get ignoredNamespaces() {
    return this.cloud.ignoredProjects.map((name) =>
      this.namespaces.find(({ name: nsName }) => name === nsName)
    );
  }

  //
  // EVENT HANDLERS
  //

  /** Called when the Cloud's sync-related properties have changed. */
  onCloudSyncChange = () => {
    if (!this.fetching) {
      logger.log(
        'DataCloud.onCloudSyncChange()',
        `Cloud sync props have changed: Fetching new data now; dataCloud=${this}`
      );
      this.fetchNow(); // NOTE: fetching will implicitly cancel all watches, if any
    }
  };

  /** Called when __this__ DataCloud should fetch new data from its Cloud. */
  onFetchData = () => this.fetchData();

  //
  // METHODS
  //

  /**
   * Starts the data fetch interval only if it isn't already active.
   * @param {number} [duration] Duration (ms) of the interval.
   */
  startInterval(duration = FETCH_INTERVAL) {
    if (!this.polling) {
      this._updateInterval = setTimeout(() => {
        this._updateInterval = null;
        // NOTE: dispatch the event instead of calling fetchData() directly so that
        //  we don't duplicate an existing request to fetch the data if one has
        //  just been scheduled
        this.dispatchEvent(DATA_CLOUD_EVENTS.FETCH_DATA);
      }, duration);
      logger.log(
        'DataCloud.startInterval()',
        `Polling interval started; duration=${duration}ms; dataCloud=${logValue(
          this.cloudUrl
        )}`
      );
    }
  }

  /**
   * Clears the data fetch interval if it's active, and optionally establishes a new
   *  interval.
   * @param {boolean} [restart] If true (default), a new interval is established if one was
   *  active. Either way, the existing interval, if any, is stopped/cleared.
   * @param {boolean} [force] If true, a new interval is established even if one
   *  was not active.
   */
  resetInterval(restart = true, force = false) {
    let wasActive = false;
    if (this.polling) {
      wasActive = true;
      clearTimeout(this._updateInterval);
      this._updateInterval = null;
      logger.log(
        'DataCloud.resetInterval()',
        `Polling interval stopped; dataCloud=${logValue(this.cloudUrl)}`
      );
    }

    if (restart && (wasActive || force)) {
      this.startInterval();
    }
  }

  /** Called when this instance is being deleted/destroyed. */
  destroy() {
    this.removeEventListener(DATA_CLOUD_EVENTS.FETCH_DATA, this.onFetchData);
    this.cloud.removeEventListener(
      CLOUD_EVENTS.SYNC_CHANGE,
      this.onCloudSyncChange
    );
    this.resetInterval(false);
  }

  /**
   * Trigger an immediate data fetch outside the normal fetch interval, causing the
   *  interval (if running) to be reset to X minutes after this fetch. Does nothing
   *  if currently fetching data.
   */
  fetchNow() {
    if (!this.fetching) {
      this.resetInterval(false); // we'll restart it after data has been fetched
      this.dispatchEvent(DATA_CLOUD_EVENTS.FETCH_DATA);
    }
  }

  // TODO[PRODX-22469]: Remove if we drop watches. Currently untested code because of body
  //  extraction issue (see other related comments).
  /**
   * Generates a watch runner and controller for a given watch and runs it.
   * @param {ApiWatch} watch Watch details.
   */
  watchCollection(watch) {
    DEV_ENV && rtv.verify({ watch }, { watch: apiWatchTs });

    watch.controller = new AbortController();

    watch.run = async () => {
      let polling = true;
      let canceled = false;
      watch.controller.signal.addEventListener('abort', () => {
        polling = false;
        canceled = true;
      });

      while (polling) {
        const { body, error, status } = await cloudRequest({
          cloud: watch.cloud,
          method: 'list',
          resourceType: watch.resourceType,
          args: {
            ...watch.args,
            resourceVersion: watch.resourceVersion, // version implies watch on 'list' API
            namespaceName: watch.namespace?.name,
            signal: watch.controller.signal,
          },
        });

        if (canceled) {
          logger.log(
            'DataCloud.watchCollection()',
            `Watch canceled: resourceType=${logValue(
              watch.resourceType
            )}, namespace=${logValue(
              watch.namespace?.name
            )}; dataCloud=${logValue(this.cloudUrl)}`
          );
          return; // exit loop
        }

        if (error) {
          if (status < 200 || status > 299) {
            logger.warn(
              'DataCloud.watchCollection()',
              `Ignoring failed watch request: resourceType=${logValue(
                watch.resourceType
              )}, namespace=${logValue(
                watch.namespace?.name
              )}, status=${status}, error=${logValue(
                error
              )}; dataCloud=${logValue(this.cloudUrl)}`
            );
          }
          // else, really ignore as it's likely a timeout waiting for a response; we'll just
          //  loop around and make another watch request
        } else {
          // response of a watch is a string potentially containing multiple JSON documents,
          //  separated by a newline if successful and something changed, or it's a single
          //  JSON document describing an error
          const docs = body.split('\n');

          const changes = docs.map((doc) => {
            try {
              return JSON.parse(doc);
            } catch (err) {
              logger.warn(
                'DataCloud.watchCollection()',
                `Ignoring watch result doc due to parsing error: resourceType=${logValue(
                  watch.resourceType
                )}, namespace=${logValue(
                  watch.namespace?.name
                )}, error=${logValue(err.message)}; dataCloud=${logValue(
                  this.cloudUrl
                )}`
              );
            }
          });

          if (
            changes.length === 1 &&
            changes[0].type === apiChangeTypes.ERROR
          ) {
            if (changes[0].object?.code === 410) {
              // re-fetch ALL data (stopping all watches) as other watches will also begin expiring
              //  (they typically aren't valid for more than 5 minutes because servers don't retain
              //  change history from a given `resourceVersion` for more than that duration)
              logger.info(
                'DataCloud.watchCollection()',
                `At least one watch has expired: Scheduling full data fetch; resourceType=${logValue(
                  watch.resourceType
                )}, namespace=${logValue(
                  watch.namespace?.name
                )}; dataCloud=${logValue(this.cloudUrl)}`
              );
              this.dispatchEvent(DATA_CLOUD_EVENTS.FETCH_DATA);
            }
            return; // exit loop
          }

          if (
            changes.length > 0 &&
            watch.resourceType === apiResourceTypes.NAMESPACE
          ) {
            // NOTE: probably easier to just stop all watches and redo full fetch because
            //  this could affect what we fetch if it was synced and now gone, or should
            //  be ignored, etc., and namespaces hopefully don't come/go/change nearly as
            //  often as the other types might
            logger.log(
              'DataCloud.watchCollection()',
              `Detected changes to at least one namespace: Scheduling full data fetch; dataCloud=${logValue(
                this.cloudUrl
              )}`
            );
            this.dispatchEvent(DATA_CLOUD_EVENTS.FETCH_DATA);
            return; // exit loop
          }

          const updates = [];
          changes.forEach((change) => {
            switch (watch.resourceType) {
              case apiResourceTypes.CLUSTER:
              case apiResourceTypes.MACHINE:
              case apiResourceTypes.PUBLIC_KEY:
              case apiResourceTypes.RHEL_LICENSE:
              case apiResourceTypes.PROXY: {
                const ResourceConstructor =
                  resourceConstructors[watch.resourcetype];
                const existingIdx = watch.namespace.proxies.findIndex(
                  (proxy) => proxy.name === change.object.metadata.name
                );
                if (
                  change.type === apiChangeTypes.MODIFIED ||
                  change.type === apiChangeTypes.DELETED
                ) {
                  // either way, we need to remove it
                  if (existingIdx >= 0) {
                    // just in case, check that we did find it
                    logger.log(
                      'DataCloud.watchCollection()',
                      `Removing ${change.type} ${
                        watch.resourceType
                      } resource from namespace=${
                        watch.namespace
                      }; dataCloud=${logValue(this.cloudUrl)}`
                    );
                    const [resource] = watch.namespace.proxies.splice(
                      existingIdx,
                      1
                    );

                    if (change.type === apiChangeTypes.DELETED) {
                      updates.push({
                        type: change.type,
                        resource,
                      });
                    }

                    if (watch.resourceType === apiResourceTypes.MACHINE) {
                      // remove from cluster also, if we can find it
                      const cluster = watch.namespace.clusters.find(
                        (c) => c.name === resource.clusterName
                      );
                      if (cluster) {
                        const list = resource.isController
                          ? 'controllers'
                          : 'workers';
                        const machineIdx = cluster[list].findIndex(
                          (m) => m.name === resource.name
                        );
                        if (machineIdx >= 0) {
                          cluster[list].splice(machineIdx, 1);
                        }
                      }
                    }
                  }
                }

                if (
                  change.type === apiChangeTypes.ADDED ||
                  change.type === apiChangeTypes.MODIFIED
                ) {
                  // add new or replace the old we just removed
                  const resource = new ResourceConstructor({
                    data: change.object,
                    namespace: watch.namespace,
                    cloud: watch.cloud,
                  });
                  const prop = resourceToNamespaceProp[watch.resourceType];
                  logger.log(
                    'DataCloud.watchCollection()',
                    `Inserting ${change.type} ${
                      watch.resourceType
                    } resource into namespace=${
                      watch.namespace
                    }; dataCloud=${logValue(this.cloudUrl)}`
                  );
                  watch.namespace[prop].push(resource);

                  updates.push({
                    type: change.type,
                    resource,
                  });

                  if (watch.resourceType === apiResourceTypes.MACHINE) {
                    // add to cluster also, if we can find it
                    const cluster = watch.namespace.clusters.find(
                      (c) => c.name === resource.clusterName
                    );
                    if (cluster) {
                      const list = resource.isController
                        ? 'controllers'
                        : 'workers';
                      cluster[list].push(resource);
                    }
                  }
                }

                break;
              }

              default: // must be a credential type
                if (
                  !Object.values(apiCredentialTypes).includes(
                    watch.resourceType
                  )
                ) {
                  throw new Error(
                    `Unknown watch resourceType=${logValue(
                      watch.resourceType
                    )}; expected a credential type`
                  );
                }

                break;
            }
          });

          if (updates.length > 0) {
            logger.log(
              'DataCloud.watchCollection()',
              `Sending resource update event for ${
                updates.length
              } resources; dataCloud=${logValue(this.cloudUrl)}`
            );

            // NOTE: __send__, not dispatch, to make sure listeners receive all updates across
            //  a series of events
            this.sendEvent(DATA_CLOUD_EVENTS.RESOURCE_UPDATED, { updates });
          }
        }
      }
    };

    watch.run(); // don't await
  }

  // TODO[PRODX-22469]: Remove if we drop watches.
  /**
   * Starts watching the API for changes.
   *
   * Does nothing if already watching the API for changes.
   *
   * @param {Array<Watch>} newWatches
   */
  startWatching(newWatches) {
    DEV_ENV && rtv.verify({ newWatches }, { newWatches: [[apiWatchTs]] });

    if (this.watching) {
      logger.warn(
        'DataCloud.startWatching()',
        `Already watching API for changes: Ignoring new watches; dataCloud=${logValue(
          this.cloudUrl
        )}`
      );
      return;
    }

    // NOTE: it's the same for every namespace, so we're expecting a set number of watches
    //  on a set of API resources per __synced__ namespace, and then one additional watch
    //  for the NAMESPACE resource (to watch for new/deleted/updated namespaces); if we
    //  don't have this, then something is wrong, and we bail
    const watchesByType = {
      [apiResourceTypes.NAMESPACE]: [],
      [apiResourceTypes.CLUSTER]: [],
      [apiResourceTypes.MACHINE]: [],
      [apiResourceTypes.PUBLIC_KEY]: [],
      [apiResourceTypes.RHEL_LICENSE]: [],
      [apiResourceTypes.PROXY]: [],
      ...Object.values(apiCredentialTypes).reduce((acc, type) => {
        acc[type] = [];
        return acc;
      }, {}),
    };

    newWatches.forEach((watch) => {
      watchesByType[watch.resourceType].push(watch);
    });

    const valid = Object.entries(watchesByType).every(
      ([resourceType, watches]) => {
        if (resourceType === apiResourceTypes.NAMESPACE) {
          // there must always be exactly 1 watch for the NAMESPACE resource because everyone
          //  should have permission to list the namespaces they have access to, and namespaces
          //  are a singular, mgmt cluster-wide resource type
          if (watches.length !== 1) {
            logger.error(
              'DataCloud.startWatching()',
              `Unable to start watching: Incorrect number of watches for resourceType=${logValue(
                resourceType
              )}, expected=1, watches=${watches.length}; dataCloud=${logValue(
                this.cloudUrl
              )}`
            );
            return false; // break: invalid
          }
        }
        // else, we can't have any expectations about the other watches because we don't know
        //  the user's permissions: any APIs they don't have access to will be missing a watch

        return watches.every((watch) => {
          if (watch.run) {
            logger.error(
              'DataCloud.startWatching()',
              `Unable to start watching: At least one watch is already running; resourceType=${logValue(
                resourceType
              )}, namespace=${logValue(
                watch.namespace?.name
              )}; dataCloud=${logValue(this.cloudUrl)}`
            );
            return false; // break: invalid
          }

          return true; // valid
        });
      }
    );

    if (valid && newWatches.length > 0) {
      logger.log(
        'DataCloud.startWatching()',
        `Starting API watches for efficient change detection; dataCloud=${logValue(
          this.cloudUrl
        )}`
      );

      newWatches.forEach((watch) => {
        this.watchCollection(watch);
      });

      this.watches = newWatches;
    }
  }

  // TODO[PRODX-22469]: Remove if we drop watches.
  /**
   * Stops all watches, if any, and forcefully resets/restarts the full data fetch interval.
   *
   * Does nothing if there are no watches.
   */
  stopWatching() {
    if (!this.watching) {
      return;
    }

    logger.log(
      'DataCloud.stopWatching()',
      `Canceling all active watches; dataCloud=${logValue(this.cloudUrl)}`
    );

    this.watches.forEach((watch) => {
      watch.controller.abort();
    });

    this.watches = [];
  }

  /**
   * Fetches new data from the `cloud`. Add event listeners to get notified when
   *  the fetch completes.
   */
  async fetchData() {
    if (this.fetching) {
      return;
    }

    // make sure we have a Cloud and it's connected
    if (!this.cloud?.connected) {
      // if no config (eg. when we restore cloud from disk) try to load it
      if (!this.cloud.config) {
        await this.cloud.loadConfig();
        // if loadConfig error we get it as connectError
        if (this.cloud.connectError) {
          this.error = getErrorMessage(this.cloud.connectError);
        }
      }
    }

    // if we're still not connected, stop the fetch before it starts
    if (!this.cloud.connected) {
      logger.log(
        'DataCloud.fetchData()',
        `Cannot fetch data: Cloud is ${
          this.cloud ? this.cloud.status : 'unknown'
        }; dataCloud=${this}`
      );
      return;
    }

    this.fetching = true;
    logger.log(
      'DataCloud.fetchData()',
      `Fetching full data for dataCloud=${this}`
    );

    this.stopWatching();

    // NOTE: we always fetch ALL namespaces (which should be quite cheap to do)
    //  since we need to discover new ones, and know when existing ones are removed
    const nsResults = await _fetchNamespaces(this.cloud, this.preview);

    // NOTE: if we fail to get namespaces for whatever reason, we MUST abort the fetch;
    //  if we don't, `nsResults.namespaces` will be empty and we'll assume all namespaces
    //  have been deleted, resulting in all the user's sync settings being lost and all
    //  items removed from the Catalog...
    if (nsResults.error) {
      this.error = nsResults.error.message;
      logger.error(
        'DataCloud.fetchData()',
        `Failed to get namespaces: Aborting data fetch, will try again soon; dataCloud=${this}`
      );
      this.fetching = false;
      this.startInterval(FETCH_INTERVAL_QUICK); // retry sooner rather than later
      return;
    }

    const allNamespaces = nsResults.namespaces.concat();

    // if we're not generating a preview, only fetch full data for synced namespaces
    //  (which may contain some newly-discovered ones after the update we just did
    //  using `allNamespaces`)
    const fetchedNamespaces = this.preview
      ? allNamespaces
      : allNamespaces.filter((ns) =>
          this.cloud.syncedProjects.includes(ns.name)
        );

    let errorsOccurred = false;
    if (!this.preview) {
      const credResults = await _fetchCredentials(
        this.cloud,
        fetchedNamespaces
      );
      const keyResults = await _fetchSshKeys(this.cloud, fetchedNamespaces);
      // map all the resources fetched so far into their respective Namespaces
      fetchedNamespaces.forEach((namespace) => {
        namespace.sshKeys = keyResults.sshKeys[namespace.name] || [];
        namespace.credentials = credResults.credentials[namespace.name] || [];
      });
      errorsOccurred =
        errorsOccurred ||
        credResults.errorsOccurred ||
        keyResults.errorsOccurred;

      const proxyResults = await _fetchProxies(this.cloud, fetchedNamespaces);
      const licenseResults = await _fetchLicenses(
        this.cloud,
        fetchedNamespaces
      );
      // map fetched proxies and licenses into their respective Namespaces
      fetchedNamespaces.forEach((namespace) => {
        namespace.proxies = proxyResults.proxies[namespace.name] || [];
        namespace.licenses = licenseResults.licenses[namespace.name] || [];
      });
      errorsOccurred =
        errorsOccurred ||
        proxyResults.errorsOccurred ||
        licenseResults.errorsOccurred;

      // NOTE: fetch machines only AFTER licenses have been fetched and added
      //  into the Namespaces because the Machine resource expects to find Licenses
      const machineResults = await _fetchMachines(
        this.cloud,
        fetchedNamespaces
      );
      // map fetched machines into their respective Namespaces
      fetchedNamespaces.forEach((namespace) => {
        namespace.machines = machineResults.machines[namespace.name] || [];
      });
      errorsOccurred = errorsOccurred || machineResults.errorsOccurred;

      // NOTE: fetch clusters only AFTER everything else has been fetched and added
      //  into the Namespaces because the Cluster resource expects to find all the
      //  other resources
      const clusterResults = await _fetchClusters(
        this.cloud,
        fetchedNamespaces
      );
      // map fetched clusters into their respective Namespaces
      fetchedNamespaces.forEach((namespace) => {
        namespace.clusters = clusterResults.clusters[namespace.name] || [];
      });
      errorsOccurred = errorsOccurred || clusterResults.errorsOccurred;

      if (errorsOccurred) {
        this.error = strings.dataCloud.error.fetchErrorsOccurred();
        logger.error(
          'DataCloud.fetchData()',
          `At least one error occurred while fetching cloud resources other than namespaces: Ignoring all data, will try again next poll; dataCloud=${this}`
        );
        this.fetching = false;
        this.startInterval(FETCH_INTERVAL_QUICK); // retry sooner rather than later
        return;
      }

      // TODO[PRODX-22469]: Disabling watches until a solution can be found to the behavior
      //  where a watch request's response comes back almost immediately as status 200, but
      //  then attempting to extract the body with `response.text()` in netUtils.js#tryExtractBody()
      //  NEVER resolves. It just hangs.
      // I thought this might be similar to this issue: https://github.com/node-fetch/node-fetch/issues/665
      // And solution (for node-fetch 2.x): https://github.com/node-fetch/node-fetch#custom-highwatermark
      // But, alas, that didn't help at all. No clue what's going on. Works great in Postman,
      //  so clearly, the issue is with how we're handling these types of long-poll requests
      //  in netUtil.js#request(), but not sure what to do.
      //
      // this.startWatching([
      //   ...nsResults.watches,
      //   ...credResults.watches,
      //   ...keyResults.watches,
      //   ...proxyResults.watches,
      //   ...licenseResults.watches,
      //   ...machineResults.watches,
      //   ...clusterResults.watches,
      // ]);
      //
      // if (this.watching) {
      //   this.resetInterval(false);
      // } else {
      //   logger.info('DataCloud.fetchData()', 'Unable to start watching for changes: Falling back to polling');
      //   this.startInterval();
      // }
      this.startInterval();
    } else {
      logger.log(
        'DataCloud.fetchData()',
        `Preview only: Skipping all but namespace fetch; dataCloud=${logValue(
          this.cloudUrl
        )}`
      );
      this.startInterval();
    }

    // update the synced vs ignored namespace lists of the Cloud
    // NOTE: we do this AFTER fetching ALL data (if not preview) so that when
    //  we update the Cloud's namespace metadata, we have the summary counts
    //  for what we fetched from the __synced__ namespaces among all the namespaces
    this.cloud.updateNamespaces(allNamespaces);

    this.error = null;
    this.namespaces = allNamespaces;

    if (!this.loaded) {
      // successfully loaded at least once
      this.loaded = true;
      logger.log(
        'DataCloud.fetchData()',
        `Initial data load successful; dataCloud=${this}`
      );
    }

    this.fetching = false;
    logger.log(
      'DataCloud.fetchData()',
      `Full data fetch complete; dataCloud=${this}`
    );
  }

  /**
   * @desc reconnect cloud and fetch data for DC
   * @return {Promise<void>}
   */
  async reconnect() {
    // WARNING: does not block because goes to browser and waits for user so
    //  promise will resolve before the full connection process is complete
    await this.cloud.connect();

    if (this.cloud.connecting) {
      const handler = () => {
        if (this.cloud.connected) {
          this.cloud.removeEventListener(CLOUD_EVENTS.STATUS_CHANGE, handler);
          this.dispatchEvent(DATA_CLOUD_EVENTS.FETCH_DATA);
        }
      };
      this.cloud.addEventListener(CLOUD_EVENTS.STATUS_CHANGE, handler);
    } else {
      this.error = getErrorMessage(this.cloud.connectError);
      logger.error(
        'DataCloud.reconnect()',
        `Cloud connection failed, error=${logValue(
          this.error
        )}, dataCloud=${this}`
      );
    }
  }

  /** @returns {string} String representation of this DataCloud for logging/debugging. */
  toString() {
    return `{DataCloud loaded: ${this.loaded}, fetching: ${
      this.fetching
    }, watching: ${
      // TODO[PRODX-22469]: Remove if we drop watches.
      this.watching
    }, polling: ${this.polling}, preview: ${this.preview}, namespaces: ${
      this.loaded ? this.namespaces.length : '-1'
    }, error: ${logValue(this.error)}, cloud: ${this.cloud}}`;
  }
}
