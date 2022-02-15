import * as rtv from 'rtvjs';
import { Cloud, CLOUD_EVENTS } from './Cloud';
import { filter, flatten } from 'lodash';
import { cloudRequest, extractJwtPayload } from '../renderer/auth/authUtil';
import * as strings from '../strings';
import { Namespace } from '../renderer/store/Namespace';
import { Credential, credentialTypesList } from '../renderer/store/Credential';
import { SshKey } from '../renderer/store/SshKey';

import { logger } from '../util/logger';
import { Cluster } from '../renderer/store/Cluster';
import { EventDispatcher } from './EventDispatcher';

export const EXTENDED_CLOUD_EVENTS = Object.freeze({
  /**
   * Initial data load (fetch) only, either starting or finished.
   *
   * Expected signature: `(extCloud: ExtendedCloud) => void`
   */
  LOADED: 'loaded',

  /**
   * Whenever new data is being fetched, or done fetching (even on the initial
   *  data load, which means there's overlap with the `LOADED` event).
   *
   * Expected signature: `(extCloud: ExtendedCloud) => void`
   */
  FETCHING_CHANGE: 'fetchingChange',

  /**
   * When new data will be fetched.
   *
   * Expected signature: `(extCloud: ExtendedCloud) => void`
   */
  FETCH_DATA: 'fetchData',

  /**
   * Whenever the `error` property changes.
   *
   * Expected signature: `(extCloud: ExtendedCloud) => void`
   */
  ERROR_CHANGE: 'errorChange',

  /**
   * When any data-related property (e.g. `namespaces`) has been updated.
   *
   * Expected signature: `(extCloud: ExtendedCloud) => void`
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
 * Deserialize the raw list of credentials data from the API into credentials objects.
 * @param {Object} body Data response from /list/credential API by credentialTypes
 * @param {Namespace} namespace The Namespace object
 * @param {strings} credentialType one of credentialTypesList
 * @returns {Array<Credential>} Array of Credential objects.
 */
const _deserializeCredentialsList = function (body, namespace, credentialType) {
  if (!body || !Array.isArray(body.items)) {
    return {
      error: strings.extendedCloud.error.invalidCredentialsPayload(),
    };
  }

  return body.items
    .map((item, idx) => {
      try {
        return new Credential(item, namespace, credentialType);
      } catch (err) {
        logger.warn(
          'ExtendedCloud._deserializeCredentialsList()',
          `Ignoring credential ${idx} because it could not be deserialized: ${err.message}`,
          err
        );
        return undefined;
      }
    })
    .filter((shKey) => !!shKey);
};

/**
 * [ASYNC] Get all existing Credentials from the management cluster, for each namespace
 *  specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 * @returns {Promise<Object>} On success
 *  `{ credentials: {Array<Credential>}, tokensRefreshed: boolean }`,
 *  where `credentials` is a map of namespace name to credential type, to a raw credential
 *  API object; or `{error: string}` on error. The error will be the first-found error out of
 *  all namespaces on which SSH Key retrieval was attempted.
 */
const _fetchCredentials = async function (cloud, namespaces) {
  let tokensRefreshed = false;
  const results = await Promise.all(
    credentialTypesList.map(async (entity) => {
      return await Promise.all(
        namespaces.map(async (namespace) => {
          const {
            body,
            tokensRefreshed: refreshed,
            error,
          } = await cloudRequest({
            cloud,
            method: 'list',
            entity,
            args: { namespaceName: namespace.name }, // extra args
          });

          tokensRefreshed = tokensRefreshed || refreshed;

          const items = _deserializeCredentialsList(body, namespace, entity);

          return {
            items,
            error: error || items.error,
            namespace,
          };
        })
      );
    })
  );

  // `results` will be an array of arrays because of each credential type that was
  //  retrieved for each namespace
  const flattenCreds = flatten(results);

  const error = flattenCreds.find((c) => c.error);
  if (error) {
    return { error };
  }

  const credentials = flattenCreds.reduce((acc, val) => {
    const {
      namespace: { name: nsName },
      items,
    } = val;
    if (acc[nsName]) {
      acc[nsName] = [...acc[nsName], ...items];
    } else {
      acc[nsName] = [...items];
    }
    return acc;
  }, {});

  return { credentials, tokensRefreshed };
};

/**
 * Deserialize the raw list of sshKeys data from the API into sshKeys object.
 * @param {Object} body Data response from /list/sshKey API
 * @param {Namespace} namespace The Namespace object
 * @returns {Array<SshKey>} Array of SshKey objects.
 */
const _deserializeSshKeysList = function (body, namespace) {
  if (!body || !Array.isArray(body.items)) {
    return {
      error: strings.extendedCloud.error.invalidSshKeysPayload(),
    };
  }

  return body.items
    .map((item, idx) => {
      try {
        return new SshKey(item, namespace);
      } catch (err) {
        logger.warn(
          'ExtendedCloud._deserializeSshKeysList()',
          `Ignoring sshKey ${idx} because it could not be deserialized: ${err.message}`,
          err
        );
        return undefined;
      }
    })
    .filter((shKey) => !!shKey);
};

/**
 * [ASYNC] Get all existing SSH Keys from the management cluster, for each namespace
 *  specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 * @returns {Promise<Object>} On success `{ sshKeys: { [index: string]: Array<ApiSshKey> }, tokensRefreshed: boolean }`,
 *  where `sshKeys` is a map of namespace name to list of SSH keys; or `{error: string}` on error.
 *  The error will be the first-found error out of all namespaces on which SSH Key retrieval
 *  was attempted.
 */
const _fetchSshKeys = async function (cloud, namespaces) {
  let tokensRefreshed = false;
  const results = await Promise.all(
    namespaces.map(async (namespace) => {
      const {
        body,
        tokensRefreshed: refreshed,
        error,
      } = await cloudRequest({
        cloud,
        method: 'list',
        entity: 'publickey',
        args: { namespaceName: namespace.name }, // extra args
      });

      tokensRefreshed = tokensRefreshed || refreshed;

      const items = _deserializeSshKeysList(body, namespace);
      return { items, error: error || items.error, namespace };
    })
  );

  const error = results.find((sk) => sk.error);
  if (error) {
    return { error };
  }

  const sshKeys = results.reduce((acc, val) => {
    const {
      namespace: { name: nsName },
      items,
    } = val;
    acc[nsName] = items;
    return acc;
  }, {});

  return { sshKeys, tokensRefreshed };
};

/**
 * Deserialize the raw list of cluster data from the API into Cluster objects.
 * @param {Object} body Data response from /list/cluster API.
 * @param {Cloud} cloud The Cloud object used to access the clusters.
 * @param {Namespace} namespace The Namespace object
 * @returns {Array<Cluster>} Array of Cluster objects.
 */
const _deserializeClustersList = function (body, cloud, namespace) {
  if (!body || !Array.isArray(body.items)) {
    return { error: strings.extendedCloud.error.invalidClusterPayload() };
  }

  return body.items
    .map((item, idx) => {
      try {
        return new Cluster(item, cloud.username, namespace);
      } catch (err) {
        logger.warn(
          'ExtendedCloud._deserializeClustersList()',
          `Ignoring cluster ${idx} (namespace/name="${
            item?.metadata?.namespace ?? '<unknown>'
          }/${
            item?.metadata?.name ?? '<unknown>'
          }") because it could not be deserialized: ${err.message}`,
          err
        );
        return undefined;
      }
    })
    .filter((cl) => !!cl); // eliminate invalid clusters (`undefined` items)
};

/**
 * Deserialize the raw list of namespace data from the API into Namespace objects.
 * @param {Object} body Data response from /list/namespace API.
 * @returns {Array<Namespace>} Array of Namespace objects.
 */
const _deserializeNamespacesList = function (body) {
  if (!body || !Array.isArray(body.items)) {
    return {
      error: strings.extendedCloud.error.invalidNamespacePayload(),
    };
  }

  return {
    data: body.items
      .map((item, idx) => {
        try {
          return new Namespace(item);
        } catch (err) {
          logger.warn(
            'ExtendedCloud._deserializeNamespacesList()',
            `Ignoring namespace ${idx} because it could not be deserialized: ${err.message}`,
            err
          );
          return undefined;
        }
      })
      .filter((cl) => !!cl), // eliminate invalid namespaces (`undefined` items)
  };
};

/**
 * [ASYNC] Get all existing namespaces from the management cluster.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @returns {Promise<Object>} On success `{ namespaces: Array<Namespace>, tokensRefreshed: boolean }`;
 *  on error `{error: string}`.
 */
const _fetchNamespaces = async function (cloud) {
  // NOTE: we always fetch ALL known namespaces because when we display metadata
  //  about this ExtendedCloud, we always need to show the actual total, not just
  //  what we're syncing
  const { error, body, tokensRefreshed } = await cloudRequest({
    cloud,
    method: 'list',
    entity: 'namespace',
  });

  if (error) {
    return { error };
  }

  const { data, error: dsError } = _deserializeNamespacesList(body);
  if (dsError) {
    return { error: dsError };
  }

  const userRoles = extractJwtPayload(cloud.token).iam_roles || [];

  const hasReadPermissions = (name) =>
    userRoles.includes(`m:kaas:${name}@reader`) ||
    userRoles.includes(`m:kaas:${name}@writer`);

  const ignoredNamespaces = cloud?.config?.ignoredNamespaces || [];
  const namespaces = filter(
    data,
    (ns) => !ignoredNamespaces.includes(ns.name) && hasReadPermissions(ns.name)
  );

  return { namespaces, tokensRefreshed };
};

/**
 * [ASYNC] Get all existing clusters from the management cluster, for each namespace
 *  specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 * @returns {Promise<Object>} On success `{ clusters: Array<Cluster>, tokensRefreshed: boolean }`
 *  where the list of clusters is flat and in the order of the specified namespaces (use
 *  `Cluster.namespace` to identify which cluster belongs to which namespace);
 *  on error `{error: string}`. The error will be the first-found error out of
 *  all namespaces on which cluster retrieval was attempted.
 */
const _fetchClusters = async function (cloud, namespaces) {
  let tokensRefreshed = false;

  const results = await Promise.all(
    namespaces.map(async (namespace) => {
      const {
        body,
        tokensRefreshed: refreshed,
        error,
      } = await cloudRequest({
        cloud,
        method: 'list',
        entity: 'cluster',
        args: { namespaceName: namespace.name }, // extra args
      });
      tokensRefreshed = tokensRefreshed || refreshed;

      const items = _deserializeClustersList(body, cloud, namespace);
      return { items, error: error || items.error, namespace };
    })
  );

  const error = results.find((cl) => cl.error);
  if (error) {
    return { error };
  }

  let clusters = [];

  results.every(({ items }) => {
    clusters = [...clusters, ...items];
    return true; // next
  });

  return { clusters, tokensRefreshed };
};

export class ExtendedCloud extends EventDispatcher {
  constructor(cloud) {
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
            'ExtendedCloud.[set]cloud',
            `Received new Cloud: Scheduling new data fetch; extCloud=${this}`
          );
          this.dispatchEvent(EXTENDED_CLOUD_EVENTS.FETCH_DATA, this);
        }
      },
    });

    /**
     * @member {boolean} loaded True if we have __successfully__ fetched Cloud data at least once;
     *  false otherwise.
     * @see {@link ExtendedCloud.loading}
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
          this.dispatchEvent(EXTENDED_CLOUD_EVENTS.LOADED, this);
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
          this.dispatchEvent(EXTENDED_CLOUD_EVENTS.FETCHING_CHANGE, this);
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
          this.dispatchEvent(EXTENDED_CLOUD_EVENTS.DATA_UPDATED, this);
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
          this.dispatchEvent(EXTENDED_CLOUD_EVENTS.ERROR_CHANGE, this);
        }
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
    this.addEventListener(EXTENDED_CLOUD_EVENTS.FETCH_DATA, this.onFetchData);

    // start fetching new data on a regular interval (i.e. don't just rely on
    //  `cloud` properties changing to trigger a fetch) so we discover changes
    //  in the Cloud (e.g. new clusters, namespaces removed, etc)
    this._updateInterval = setInterval(() => {
      // NOTE: dispatch the event instead of calling fetchData() directly so that
      //  we don't duplicate an existing request to fetch the data if one has
      //  just been scheduled
      this.dispatchEvent(EXTENDED_CLOUD_EVENTS.FETCH_DATA, this);
    }, FETCH_INTERVAL);

    // schedule the initial data load/fetch
    this.dispatchEvent(EXTENDED_CLOUD_EVENTS.FETCH_DATA, this);
  }

  /**
   * @member {boolean} loading True if we're loading/fetching Cloud data for the __first__ time;
   *  false otherwise.
   * @see {@link ExtendedCloud.fetching}
   */
  get loading() {
    return !this.loaded && this.fetching;
  }

  /**
   * @member {Array<Namespace>} syncedNamespaces List of namespaces the Cloud is syncing;
   *  empty if none or the namespaces haven't been successfully fetched at least once yet.
   */
  get syncedNamespaces() {
    return this.namespaces.filter(
      (namespace) =>
        this.cloud.syncAll || this.cloud.syncNamespaces.includes(namespace.name)
    );
  }

  /** Called when this instance is being deleted/destroyed. */
  destroy() {
    this.removeEventListener(
      EXTENDED_CLOUD_EVENTS.FETCH_DATA,
      this.onFetchData
    );
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
      'ExtendedCloud.onCloudSyncChange()',
      `Cloud sync props have changed: Scheduling new data fetch on next frame; extCloud=${this}`
    );
    this.dispatchEvent(EXTENDED_CLOUD_EVENTS.FETCH_DATA, this);
  };

  /** Trigger an immediate data fetch outside the normal fetch interval. */
  fetchNow() {
    this.dispatchEvent(EXTENDED_CLOUD_EVENTS.FETCH_DATA, this);
  }

  /** Called when __this__ ExtendedCloud should fetch new data from its Cloud. */
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
        'ExtendedCloud.fetchData()',
        `Cannot fetch data for extCloud=${this}: Cloud is ${
          this.cloud ? this.cloud.status : 'unknown'
        }`
      );
      return;
    }

    this.fetching = true;

    logger.log(
      'ExtendedCloud.fetchData()',
      `Fetching data for extCloud=${this}`
    );

    const nsResults = await _fetchNamespaces(this.cloud);
    let error = nsResults.error;
    let clusterResults;
    let keyResults;
    let credResults;

    if (!nsResults.error) {
      clusterResults = await _fetchClusters(this.cloud, nsResults.namespaces);
      error = clusterResults.error;
      if (!clusterResults.error) {
        credResults = await _fetchCredentials(this.cloud, nsResults.namespaces);
        error = credResults.error;
        if (!credResults.error) {
          keyResults = await _fetchSshKeys(this.cloud, nsResults.namespaces);
          error = keyResults.error;
        }
      }
    }

    if (error) {
      // NOTE: in this case, we don't set `this.namespaces`, leaving it as its
      //  previous value so we don't lose the Cloud's last known state if we have it
      this.error = getErrorMessage(error);

      if (nsResults?.error) {
        logger.error(
          'ExtendedCloud.fetchData()',
          `Failed to fetch namespaces; error="${nsResults.error}", extCloud=${this}`
        );
      }

      if (clusterResults?.error) {
        logger.error(
          'ExtendedCloud.fetchData()',
          `Failed to get cluster metadata, error="${clusterResults?.error}", extCloud=${this}`
        );
      }

      if (keyResults?.error) {
        logger.error(
          'ExtendedCloud.fetchData()',
          `Failed to get ssh key metadata, error="${keyResults?.error}", extCloud=${this}`
        );
      }

      if (credResults?.error) {
        logger.error(
          'ExtendedCloud.fetchData()',
          `Failed to get credential metadata, error="${credResults?.error}", extCloud=${this}`
        );
      }
    } else {
      this.error = null;

      this.namespaces = nsResults.namespaces.map((namespace) => {
        namespace.clusters = clusterResults.clusters.filter(
          (c) => c.namespace.name === namespace.name
        );
        namespace.sshKeys = keyResults.sshKeys[namespace.name];
        namespace.credentials = credResults.credentials[namespace.name];
        return namespace;
      });

      if (!this.loaded) {
        // successfully loaded at least once
        this.loaded = true;
        logger.log(
          'ExtendedCloud.fetchData()',
          `Initial data load successful, extCloud=${this}`
        );
      }
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
          this.dispatchEvent(EXTENDED_CLOUD_EVENTS.FETCH_DATA, this);
        }
      };
      this.cloud.addEventListener(CLOUD_EVENTS.STATUS_CHANGE, handler);
    } else {
      this.error = this.cloud.connectError;
    }
  }

  /** @returns {string} String representation of this ExtendedCloud for logging/debugging. */
  toString() {
    return `{ExtendedCloud loaded: ${this.loaded}, fetching: ${
      this.fetching
    }, namespaces: ${this.loaded ? this.namespaces.length : '??'}, error: ${
      this.error
    }, cloud: ${this.cloud}}`;
  }
}
