import * as rtv from 'rtvjs';
import { Cloud, CLOUD_EVENTS } from './Cloud';
import { filter } from 'lodash';
import { cloudRequest, extractJwtPayload } from '../api/apiUtil';
import { Namespace } from '../api/types/Namespace';
import { Credential } from '../api/types/Credential';
import { SshKey } from '../api/types/SshKey';
import { Cluster } from '../api/types/Cluster';
import { Proxy } from '../api/types/Proxy';
import { License } from '../api/types/License';
import { logger } from '../util/logger';
import { EventDispatcher } from './EventDispatcher';
import { apiEntities, apiCredentialEntities } from '../api/apiConstants';

export const DATA_CLOUD_EVENTS = Object.freeze({
  /**
   * Initial data load (fetch) only, either starting or finished.
   *
   * Expected signature: `(dataCloud: DataCloud) => void`
   */
  LOADED: 'loaded',

  /**
   * Whenever new data is being fetched, or done fetching (even on the initial
   *  data load, which means there's overlap with the `LOADED` event).
   *
   * Expected signature: `(dataCloud: DataCloud) => void`
   */
  FETCHING_CHANGE: 'fetchingChange',

  /**
   * When new data will be fetched.
   *
   * Expected signature: `(dataCloud: DataCloud) => void`
   */
  FETCH_DATA: 'fetchData',

  /**
   * Whenever the `error` property changes.
   *
   * Expected signature: `(dataCloud: DataCloud) => void`
   */
  ERROR_CHANGE: 'errorChange',

  /**
   * When any data-related property (e.g. `namespaces`) has been updated.
   *
   * Expected signature: `(dataCloud: DataCloud) => void`
   */
  DATA_UPDATED: 'dataUpdated',
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
 *
 * @type {number}
 */
const FETCH_INTERVAL = 4.85 * 60 * 1000; // 4:51 minutes (AVOID exactly 5 minutes)

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
 * Deserialize a raw list of API entity objects into `ApiObject` instances.
 * @param {string} entity API entity name to fetch from the `apiConstants.apiEntities` enum.
 * @param {Object} body Data response from `/list/{entity}` API.
 * @param {Namespace} [namespace] The related Namespace; `undefined` if fetching
 *  namespaces themselves (i.e. `entity === apiEntities.NAMESPACE`).
 * @param {(params: { data: Object, namespace?: Namespace }) => ApiObject} params.create Function
 *  called to create new instance of an `ApiObject`-based class that represents the API entity.
 *  - `data` is the raw object returned from the API for the entity
 *  - `namespace` is the related Namespace (`undefined` when fetching namespaces themselves
 *      with `entity === apiEntities.NAMESPACE`)
 * @returns {Array<ApiObject>} Array of API objects. Empty list if none. Any
 *  item that can't be deserialized is ignored and not returned in the list.
 */
const _deserializeEntityList = function (entity, body, namespace, create) {
  if (!body || !Array.isArray(body.items)) {
    logger.error(
      'DataCloud._deserializeEntityList()',
      `Failed to parse "${entity}" payload: Unexpected data format`
    );
    return [];
  }

  return body.items
    .map((data, idx) => {
      try {
        return create({ data, namespace });
      } catch (err) {
        logger.warn(
          'DataCloud._deserializeEntityList()',
          `Ignoring "${entity}" entity ${idx}${
            namespace ? ` from namespace "${namespace.name}"` : ''
          }: Could not be deserialized, error="${getErrorMessage(err)}"`,
          err
        );
        return undefined;
      }
    })
    .filter((obj) => !!obj);
};

/**
 * [ASYNC] Best-try to get all existing entities of a given type from the management cluster,
 *  for each namespace specified.
 * @param {Object} params
 * @param {string} params.entity API entity name to fetch from the `apiConstants.apiEntities` enum.
 * @param {Cloud} params.cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} [params.namespaces] List of namespaces in which to get the entities.
 *  __REQUIRED__ unless `entity === apiEntities.NAMESPACE`, in which case this parameter is
 *  ignored because we're fetching the namespaces themselves.
 * @param {(params: { data: Object, namespace?: Namespace }) => ApiObject} params.create Function
 *  called to create new instance of an `ApiObject`-based class that represents the API entity.
 *  - `data` is the raw object returned from the API for the entity
 *  - `namespace` is the related Namespace (`undefined` when fetching namespaces themselves
 *      with `entity === apiEntities.NAMESPACE`)
 * @returns {Promise<Object>} Never fails, always resolves in
 *  `{ entities: { [index: string]: Array<ApiObject> }, tokensRefreshed: boolean }`,
 *  where `entities` is a map of namespace name to list of `ApiObject`-based instances
 *  as returned by `create()`. If an error occurs trying to get an entity or deserialize
 *  it, it is ignored/skipped.
 *
 *  NOTE: If `entity === apiEntities.NAMESPACE` (i.e. fetching namespaces themselves),
 *   `entities` is a map with a single key which is the `apiEntities.NAMESPACE` entity
 *   mapped to the list of all namespaces in the Cloud.
 */
const _fetchEntityList = async function ({
  entity,
  cloud,
  namespaces,
  create,
}) {
  rtv.verify(
    { entity },
    { entity: [rtv.STRING, { oneOf: Object.values(apiEntities) }] }
  );

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
      //  as an error since there are various mechianisms that could prevent
      //  a user from accessing certain entities in the API (disabled components,
      //  permissions, etc.)
      logger[status === 403 ? 'log' : 'error'](
        'DataCloud._fetchEntityList',
        `${
          status === 403 ? '(IGNORED: Access denied) ' : ''
        }Failed to get "${entity}" entities, namespace=${
          namespace?.name || namespace // undefined if `entity === apiEntities.NAMESPACE`
        }, status=${status}, error="${getErrorMessage(error)}"`
      );
    } else {
      items = _deserializeEntityList(entity, body, namespace, create);
    }

    return {
      items,
      namespace,
    };
  };

  let results;
  if (entity === apiEntities.NAMESPACE) {
    const result = await cloudRequest({
      cloud,
      method: 'list',
      entity: apiEntities.NAMESPACE,
    });
    results = [processResult(result)];
  } else {
    results = await Promise.all(
      namespaces.map(async (namespace) => {
        const result = await cloudRequest({
          cloud,
          method: 'list',
          entity,
          args: { namespaceName: namespace.name }, // extra args
        });

        return processResult(result, namespace);
      })
    );
  }

  // NOTE: the loop above ensures that there are no error results; all items in
  //  `results` have the same shape

  let entities;
  if (entity === apiEntities.NAMESPACE) {
    entities = { [apiEntities.NAMESPACE]: results[0].items };
  } else {
    entities = results.reduce((acc, val) => {
      const {
        namespace: { name: nsName },
        items,
      } = val;
      acc[nsName] = items;
      return acc;
    }, {});
  }

  return { entities, tokensRefreshed };
};

/**
 * [ASYNC] Best-try to get all existing Credentials from the management cluster, for each
 *  namespace specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 * @returns {Promise<Object>} Never fails, always resolves in
 *  `{ credentials: { [index: string]: Array<Credential> }, tokensRefreshed: boolean }`,
 *  where `credentials` is a map of namespace name to credential (regardless of type).
 *  If there's an error trying to get any credential, it will be skipped/ignored.
 */
const _fetchCredentials = async function (cloud, namespaces) {
  const results = await Promise.all(
    Object.values(apiCredentialEntities).map((entity) =>
      _fetchEntityList({
        entity,
        cloud,
        namespaces,
        create: ({ data, namespace }) =>
          new Credential({ data, namespace, cloud }),
      })
    )
  );

  // NOTE: `results` will be an array of `{ entities, tokensRefreshed }` because of each credential
  //  type that was retrieved for each namespace
  // NOTE: _fetchEntityList() ensures there are no error results; all items in
  //  `results` have the same shape

  let tokensRefreshed = false;
  const credentials = results.reduce((acc, result) => {
    const { entities, tokensRefreshed: refreshed } = result;

    tokensRefreshed = tokensRefreshed || refreshed;

    Object.keys(entities).forEach((nsName) => {
      const creds = entities[nsName];
      if (acc[nsName]) {
        acc[nsName] = [...acc[nsName], ...creds];
      } else {
        acc[nsName] = [...creds];
      }
    });

    return acc;
  }, {});

  return { credentials, tokensRefreshed };
};

/**
 * [ASYNC] Best-try to get all existing licenses from the management cluster, for each
 *  namespace specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 * @returns {Promise<Object>} Never fails, always resolves in
 *  `{ licenses: { [index: string]: Array<License> }, tokensRefreshed: boolean }`
 *  where the licenses are mapped per namespace name. If an error occurs trying to get
 *  any license, it will be ignored/skipped.
 */
const _fetchLicenses = async function (cloud, namespaces) {
  const { entities: licenses, tokensRefreshed } = await _fetchEntityList({
    entity: apiEntities.RHEL_LICENSE,
    cloud,
    namespaces,
    create: ({ data, namespace }) => new License({ data, namespace, cloud }),
  });
  return { licenses, tokensRefreshed };
};

/**
 * [ASYNC] Best-try to get all existing proxies from the management cluster, for each
 *  namespace specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 * @returns {Promise<Object>} Never fails, always resolves in
 *  `{ proxies: { [index: string]: Array<Proxy> }, tokensRefreshed: boolean }`
 *  where the proxies are mapped per namespace name. If an error occurs trying to get
 *  any proxy, it will be ignored/skipped.
 */
const _fetchProxies = async function (cloud, namespaces) {
  const { entities: proxies, tokensRefreshed } = await _fetchEntityList({
    entity: apiEntities.PROXY,
    cloud,
    namespaces,
    create: ({ data, namespace }) => new Proxy({ data, namespace, cloud }),
  });
  return { proxies, tokensRefreshed };
};

/**
 * [ASYNC] Best-try to get all existing SSH keys from the management cluster, for each
 *  namespace specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 * @returns {Promise<Object>} Never fails, always resolves in
 *  `{ sshKeys: { [index: string]: Array<SshKey> }, tokensRefreshed: boolean }`
 *  where the SSH keys are mapped per namespace name. If an error occurs trying to get
 *  any SSH key, it will be ignored/skipped.
 */
const _fetchSshKeys = async function (cloud, namespaces) {
  const { entities: sshKeys, tokensRefreshed } = await _fetchEntityList({
    entity: apiEntities.PUBLIC_KEY,
    cloud,
    namespaces,
    create: ({ data, namespace }) => new SshKey({ data, namespace, cloud }),
  });
  return { sshKeys, tokensRefreshed };
};

/**
 * [ASYNC] Best-try to get all existing clusters from the management cluster, for each
 *  namespace specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 * @returns {Promise<Object>} Never fails, always resolves in
 *  `{ clusters: { [index: string]: Array<Cluster> }, tokensRefreshed: boolean }`
 *  where the clusters are mapped per namespace name. If an error occurs trying to get
 *  any cluster, it will be ignored/skipped.
 */
const _fetchClusters = async function (cloud, namespaces) {
  const { entities: clusters, tokensRefreshed } = await _fetchEntityList({
    entity: apiEntities.CLUSTER,
    cloud,
    namespaces,
    create: ({ data, namespace }) => new Cluster({ data, namespace, cloud }),
  });
  return { clusters, tokensRefreshed };
};

/**
 * [ASYNC] Best-try to get all existing namespaces from the management cluster.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @returns {Promise<Object>} Never fails, always resolves in
 *  `{ namespaces: Array<Namespace>, tokensRefreshed: boolean }`. If an error occurs
 *  trying to get any namespace, it will be ignored/skipped.
 */
const _fetchNamespaces = async function (cloud) {
  // NOTE: we always fetch ALL known namespaces because when we display metadata
  //  about this DataCloud, we always need to show the actual total, not just
  //  what we're syncing
  const {
    entities: { [apiEntities.NAMESPACE]: namespaces },
    tokensRefreshed,
  } = await _fetchEntityList({
    entity: apiEntities.NAMESPACE,
    cloud,
    create: ({ data }) => new Namespace({ data, cloud }),
  });

  const userRoles = extractJwtPayload(cloud.token).iam_roles || [];

  const hasReadPermissions = (name) =>
    userRoles.includes(`m:kaas:${name}@reader`) ||
    userRoles.includes(`m:kaas:${name}@writer`);

  const ignoredNamespaces = cloud?.config?.ignoredNamespaces || [];

  return {
    namespaces: filter(
      namespaces,
      (ns) =>
        !ignoredNamespaces.includes(ns.name) && hasReadPermissions(ns.name)
    ),
    tokensRefreshed,
  };
};

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
   *  purposes, which reduces the amount of data fetched from the Cloud in order to
   *  make data fetching a bit faster. Retrieving licenses and proxies can take quite
   *  a bit more time for some reason, and we don't list their numbers when the user
   *  is adding a new Cloud connection, so there's no point retrieving that data if
   *  the user ultimately chooses not to add the Cloud.
   */
  constructor(cloud, preview) {
    super();

    let _loaded = false; // true if we've fetched data at least once, successfully
    let _fetching = false; // anytime we're fetching new data
    let _namespaces = [];
    let _cloud = null; // starts null, but once set, can never be null/undefined again
    let _error = null;

    /**
     * @member {Cloud} cloud The Cloud instance providing data.
     */
    Object.defineProperty(this, 'cloud', {
      enumerable: true,
      get() {
        return _cloud;
      },
      set(newValue) {
        if (newValue !== _cloud) {
          DEV_ENV &&
            rtv.verify(
              { cloud: newValue },
              { cloud: [rtv.CLASS_OBJECT, { ctor: Cloud }] } // required, cannot be undefined/null
            );

          if (_cloud) {
            // stop listening to the OLD Cloud
            _cloud.removeEventListener(
              CLOUD_EVENTS.SYNC_CHANGE,
              this.onCloudSyncChange
            );
          }

          _cloud = newValue;
          _cloud.addEventListener(
            CLOUD_EVENTS.SYNC_CHANGE,
            this.onCloudSyncChange
          );

          logger.log(
            'DataCloud.[set]cloud',
            `Received new Cloud: Scheduling new data fetch; dataCloud=${this}`
          );
          this.dispatchEvent(DATA_CLOUD_EVENTS.FETCH_DATA, this);
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
          this.dispatchEvent(DATA_CLOUD_EVENTS.LOADED, this);
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
          this.dispatchEvent(DATA_CLOUD_EVENTS.FETCHING_CHANGE, this);
        }
      },
    });

    /**
     * @member {Array<Namespace>|null} namespaces __ALL__ namespaces in the Cloud, regardless
     *  of which specific ones the Cloud may be syncing. `null` if never fetched. Empty if none.
     * @see {@link syncedNamespaces}
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
          this.dispatchEvent(DATA_CLOUD_EVENTS.DATA_UPDATED, this);
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
          this.dispatchEvent(DATA_CLOUD_EVENTS.ERROR_CHANGE, this);
        }
      },
    });

    /**
     * @member {boolean} preview True if this instance is for previous purposes
     *  only; false if it's for full use. Use a preview instance when letting the
     *  user choose whether they want to add a new Cloud or not. Use a full instance
     *  for a Cloud that has formally been added and is being synced.
     */
    Object.defineProperty(this, 'preview', {
      enumerable: true,
      get() {
        return !!preview;
      },
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

    // start fetching new data on a regular interval (i.e. don't just rely on
    //  `cloud` properties changing to trigger a fetch) so we discover changes
    //  in the Cloud (e.g. new clusters, namespaces removed, etc)
    this._updateInterval = setInterval(() => {
      // NOTE: dispatch the event instead of calling fetchData() directly so that
      //  we don't duplicate an existing request to fetch the data if one has
      //  just been scheduled
      this.dispatchEvent(DATA_CLOUD_EVENTS.FETCH_DATA, this);
    }, FETCH_INTERVAL);

    // schedule the initial data load/fetch
    this.dispatchEvent(DATA_CLOUD_EVENTS.FETCH_DATA, this);
  }

  /**
   * @member {boolean} loading True if we're loading/fetching Cloud data for the __first__ time;
   *  false otherwise.
   * @see {@link DataCloud.fetching}
   */
  get loading() {
    return !this.loaded && this.fetching;
  }

  /**
   * @member {Array<Namespace>} syncedNamespaces List of namespaces the Cloud is syncing;
   *  empty if none or the namespaces haven't been successfully fetched at least once yet.
   */
  get syncedNamespaces() {
    return this.namespaces.filter((namespace) =>
      this.cloud.syncedNamespaces.includes(namespace.name)
    );
  }

  /**
   * @member {Array<Namespace>} ignoredNamespaces List of namespaces the Cloud is not syncing;
   */
  get ignoredNamespaces() {
    return this.namespaces.filter((namespace) =>
      this.cloud.ignoredNamespaces.includes(namespace.name)
    );
  }

  /** Called when this instance is being deleted/destroyed. */
  destroy() {
    this.removeEventListener(DATA_CLOUD_EVENTS.FETCH_DATA, this.onFetchData);
    this.cloud.removeEventListener(
      CLOUD_EVENTS.SYNC_CHANGE,
      this.onCloudSyncChange
    );
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
    }
  }

  /** Called when the Cloud's sync-related properties have changed. */
  onCloudSyncChange = () => {
    logger.log(
      'DataCloud.onCloudSyncChange()',
      `Cloud sync props have changed: Scheduling new data fetch on next frame; dataCloud=${this}`
    );
    this.dispatchEvent(DATA_CLOUD_EVENTS.FETCH_DATA, this);
  };

  /** Trigger an immediate data fetch outside the normal fetch interval. */
  fetchNow() {
    this.dispatchEvent(DATA_CLOUD_EVENTS.FETCH_DATA, this);
  }

  /**
   * check if for projects and depending on syncAll we add them to Cloud.syncedNamespaces or Cloud.ignoredNamespaces
   */
  updateCloudNamespaceLists() {
    const syncedList = [];
    const ignoredList = [];

    this.namespaces.forEach(({ name }) => {
      if (this.cloud.syncAll) {
        if (this.cloud.ignoredNamespaces.includes(name)) {
          ignoredList.push(name);
        } else {
          syncedList.push(name);
        }
      } else {
        if (this.cloud.syncedNamespaces.includes(name)) {
          syncedList.push(name);
        } else {
          ignoredList.push(name);
        }
      }
    });

    this.cloud.updateNamespaces(syncedList, ignoredList, true);
  }

  /** Called when __this__ DataCloud should fetch new data from its Cloud. */
  onFetchData = () => this.fetchData();

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
      // if no config (eg when we restore cloud from disk) try to load it
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
        `Cannot fetch data for dataCloud=${this}: Cloud is ${
          this.cloud ? this.cloud.status : 'unknown'
        }`
      );
      return;
    }

    this.fetching = true;

    logger.log('DataCloud.fetchData()', `Fetching data for dataCloud=${this}`);

    const nsResults = await _fetchNamespaces(this.cloud);
    const clusterResults = await _fetchClusters(
      this.cloud,
      nsResults.namespaces
    );
    const credResults = await _fetchCredentials(
      this.cloud,
      nsResults.namespaces
    );
    const keyResults = await _fetchSshKeys(this.cloud, nsResults.namespaces);

    let proxyResults;
    let licenseResults;
    if (!this.preview) {
      proxyResults = await _fetchProxies(this.cloud, nsResults.namespaces);
      licenseResults = await _fetchLicenses(this.cloud, nsResults.namespaces);
    } else {
      logger.log(
        'DataCloud.fetchData()',
        `Skipping proxy and license fetch for preview instance, dataCloud=${this}`
      );
    }

    this.error = null;

    this.namespaces = nsResults.namespaces.map((namespace) => {
      namespace.clusters = clusterResults?.clusters[namespace.name] || [];
      namespace.sshKeys = keyResults?.sshKeys[namespace.name] || [];
      namespace.credentials = credResults?.credentials[namespace.name] || [];
      namespace.proxies = proxyResults?.proxies[namespace.name] || [];
      namespace.licenses = licenseResults?.licenses[namespace.name] || [];

      return namespace;
    });

    this.updateCloudNamespaceLists();
    if (!this.loaded) {
      // successfully loaded at least once
      this.loaded = true;
      logger.log(
        'DataCloud.fetchData()',
        `Initial data load successful, dataCloud=${this}`
      );
    }

    this.fetching = false;
  }

  /**
   * @desc reconnect cloud and fetch data for EC
   * @return {Promise<void>}
   */
  async reconnect() {
    // WARNING: does not block because goes to browser and waits for user
    await this.cloud.connect();

    if (this.cloud.connecting) {
      const handler = () => {
        if (this.cloud.connected) {
          this.cloud.removeEventListener(CLOUD_EVENTS.STATUS_CHANGE, handler);
          this.dispatchEvent(DATA_CLOUD_EVENTS.FETCH_DATA, this);
        }
      };
      this.cloud.addEventListener(CLOUD_EVENTS.STATUS_CHANGE, handler);
    } else {
      this.error = getErrorMessage(this.cloud.connectError);
      logger.error(
        'DataCloud.reconnect()',
        `Cloud connection failed, error="${this.error}", dataCloud=${this}`
      );
    }
  }

  /** @returns {string} String representation of this DataCloud for logging/debugging. */
  toString() {
    return `{DataCloud loaded: ${this.loaded}, fetching: ${
      this.fetching
    }, preview: ${this.preview}, namespaces: ${
      this.loaded ? this.namespaces.length : '??'
    }, error: ${this.error}, cloud: ${this.cloud}}`;
  }
}
