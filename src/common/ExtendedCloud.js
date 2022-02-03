import * as rtv from 'rtvjs';
import { Cloud, CLOUD_EVENTS } from './Cloud';
import { filter, find, flatten } from 'lodash';
import { cloudRequest, extractJwtPayload } from '../renderer/auth/authUtil';
import * as strings from '../strings';
import { Namespace } from '../renderer/store/Namespace';
import { logger } from '../util/logger';
import { Cluster } from '../renderer/store/Cluster';

export const EXTENDED_CLOUD_EVENTS = Object.freeze({
  /**
   * Initial data load (fetch) only, either starting or finished.
   *
   * Expected signature: `(extCloud: ExtendedCloud) => void`
   */
  LOADING_CHANGE: 'loadingChange',

  /**
   * Whenever new data is being fetched, or done fetching (even on the initial
   *  data load, which means there's overlap with the `LOADING_CHANGE` event).
   *
   * Expected signature: `(extCloud: ExtendedCloud) => void`
   */
  FETCHING_CHANGE: 'fetchingChange',

  /**
   * When any data-related property, including `error`, has been updated.
   *
   * Expected signature: `(extCloud: ExtendedCloud) => void`
   */
  DATA_UPDATED: 'dataUpdated',

  /**
   * When new data will be fetched.
   *
   * Expected signature: `(extCloud: ExtendedCloud) => void`
   */
  FETCH_DATA: 'fetchData',
});

const FIVE_MIN = 300 * 1000;

const credentialTypes = [
  'awscredential',
  'byocredential',
  'openstackcredential',
];

const getErrorMessage = (error) => {
  if (!error) {
    return null;
  }
  if (typeof error === 'string') {
    return error;
  }
  return error.message;
};

const _deserializeCredentialsList = function (body) {
  if (!body || !Array.isArray(body.items)) {
    return {
      error: strings.extendedCloud.error.invalidCredentialsPayload(),
    };
  }

  return body.items;
};

const _fetchCredentials = async function (cloud, namespaces) {
  let tokensRefreshed = false;
  const results = await Promise.all(
    credentialTypes.map(async (entity) => {
      return await Promise.all(
        namespaces.map(async (namespaceName) => {
          const {
            body,
            tokensRefreshed: refreshed,
            error,
          } = await cloudRequest({
            cloud,
            method: 'list',
            entity,
            args: { namespaceName }, // extra args
          });

          tokensRefreshed = tokensRefreshed || refreshed;

          const items = _deserializeCredentialsList(body);
          return {
            items,
            error: error || items.error,
            namespace: namespaceName,
            credentialType: entity,
          };
        })
      );
    })
  );
  const flattenCreds = flatten(results);

  const error = flattenCreds.find((c) => c.error);

  if (error) {
    return { error };
  }

  const credentials = flattenCreds.reduce((acc, val) => {
    const { namespace, credentialType, items } = val;
    if (acc[namespace]) {
      acc[namespace][credentialType] = items;
      acc[namespace].allCredentialsCount += items.length;
    } else {
      acc[namespace] = {
        [credentialType]: items,
        allCredentialsCount: items.length,
      };
    }
    return acc;
  }, {});

  return { credentials, tokensRefreshed };
};

const _deserializeSshKeysList = function (body) {
  if (!body || !Array.isArray(body.items)) {
    return {
      error: strings.extendedCloud.error.invalidSshKeysPayload(),
    };
  }

  return body.items;
};

const _fetchSshKeys = async function (cloud, namespaces) {
  let tokensRefreshed = false;
  const sshKeys = await Promise.all(
    namespaces.map(async (namespaceName) => {
      const {
        body,
        tokensRefreshed: refreshed,
        error,
      } = await cloudRequest({
        cloud,
        method: 'list',
        entity: 'publickey',
        args: { namespaceName }, // extra args
      });

      tokensRefreshed = tokensRefreshed || refreshed;

      const items = _deserializeSshKeysList(body);
      return { items, error: error || items.error, namespace: namespaceName };
    })
  );

  const errResult = find(sshKeys, (r) => !!r.error);
  if (errResult) {
    return { error: errResult.error };
  }

  return { sshKeys, tokensRefreshed };
};

/**
 * Deserialize the raw list of cluster data from the API into Cluster objects.
 * @param {Object} body Data response from /list/cluster API.
 * @param {Cloud} cloud The Cloud object used to access the clusters.
 * @returns {Array<Cluster>} Array of Cluster objects.
 */
const _deserializeClustersList = function (body, cloud) {
  if (!body || !Array.isArray(body.items)) {
    return { error: strings.extendedCloud.error.invalidClusterPayload() };
  }

  return {
    data: body.items
      .map((item, idx) => {
        try {
          return new Cluster(item, cloud.username);
        } catch (err) {
          logger.error(
            'ExtendedCloud._deserializeClustersList()',
            `Failed to deserialize cluster ${idx} (namespace/name="${
              item?.metadata?.namespace ?? '<unknown>'
            }/${item?.metadata?.name ?? '<unknown>'}"): ${err.message}`,
            err
          );
          return undefined;
        }
      })
      .filter((cl) => !!cl), // eliminate invalid clusters (`undefined` items)
  };
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
          logger.error(
            'ExtendedCloud._deserializeNamespacesList()',
            `Failed to deserialize namespace ${idx}: ${err.message}`,
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
 * @returns {Promise<Object>} On success `{ namespaces: Array<string>, tokensRefreshed: boolean }`;
 *  on error `{error: string}`.
 */
const _fetchNamespaces = async function (cloud) {
  // return syncNamespaces if we already define them
  if (cloud?.syncNamespaces?.length && !cloud.syncAll) {
    return { namespaces: cloud.syncNamespaces, tokensRefreshed: false };
  }

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
  ).map(({ name }) => name);

  return { namespaces, tokensRefreshed };
};

/**
 * [ASYNC] Get all existing clusters from the management cluster, for each namespace
 *  specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<string>} namespaces List of namespace NAMES for which to retrieve
 *  clusters.
 * @returns {Promise<Object>} On success `{ clusters: Array<Cluster>, tokensRefreshed: boolean }`
 *  where the list of clusters is flat and in the order of the specified namespaces (use
 *  `Cluster.namespace` to identify which cluster belongs to which namespace);
 *  on error `{error: string}`. The error will be the first-found error out of
 *  all namespaces on which cluster retrieval was attempted.
 */
const _fetchClusters = async function (cloud, namespaces) {
  const results = await Promise.all(
    namespaces.map((namespaceName) =>
      cloudRequest({
        cloud,
        method: 'list',
        entity: 'cluster',
        args: { namespaceName }, // extra args
      })
    )
  );

  let errResult;
  let tokensRefreshed = false;
  results.every((r) => {
    if (r.error && !errResult) {
      errResult = r;
    }

    tokensRefreshed = tokensRefreshed || r.tokensRefreshed;

    // keep looking until we've found both or reached the end
    return !!errResult && tokensRefreshed;
  });

  if (errResult) {
    return { error: errResult.error };
  }

  let clusters = [];
  let dsError;

  results.every((result) => {
    const { data, error } = _deserializeClustersList(result.body, cloud);
    if (error) {
      dsError = { error };
      return false; // break
    }

    clusters = [...clusters, ...data];
    return true; // next
  });

  return dsError || { clusters, tokensRefreshed };
};

const getId = (function () {
  let nextId = 0;
  return () => {
    nextId++;
    return nextId;
  };
})(); // DEBUG REMOVE

export class ExtendedCloud {
  constructor(cloud) {
    this.INSTANCE_ID = getId(); // DEBUG REMOVE

    const _eventListeners = {}; // map of event name to array of functions that are handlers
    const _eventQueue = []; // list of `{ name: string, params: Array }` objects to dispatch
    let _dispatchTimerId; // ID of the scheduled dispatch timer if a dispatch is scheduled, or undefined

    // asynchronously dispatches queued events on the next frame
    const _scheduleDispatch = () => {
      if (_dispatchTimerId === undefined) {
        _dispatchTimerId = setTimeout(function () {
          _dispatchTimerId = undefined;
          if (
            Object.keys(_eventListeners).length > 0 &&
            _eventQueue.length > 0
          ) {
            const events = _eventQueue.concat(); // shallow clone for local copy

            // remove all events immediately in case more get added while we're
            //  looping through this set
            _eventQueue.length = 0;

            // NOTE: somehow, though this code appers synchronous, there's something
            //  in `Array.forEach()` that appears to loop over multiple execution frames,
            //  so it's possible that while we're looping, new events are dispatched
            events.forEach((event) => {
              const { name, params } = event;
              const handlers = _eventListeners[name] || [];
              console.log(
                '####### ExtendedCloud._scheduleDispatch(): DISPATCHING event=%s',
                name
              ); // DEBUG LOG
              handlers.forEach((handler) => {
                try {
                  handler(...params);
                } catch {
                  // ignore
                }
              });
            });

            if (_eventQueue.length > 0) {
              // received new events while processing previous batch
              _scheduleDispatch();
            }
          }
        });
      } else {
        console.log(
          '####### ExtendedCloud._scheduleDispatch(): already scheduled'
        ); // DEBUG LOG
      }
    };

    Object.defineProperties(this, {
      /**
       * Adds an event listener to this ExtendedCloud instance.
       * @method addEventListener
       * @param {string} name Event name.
       * @param {Function} handler Handler.
       */
      addEventListener: {
        enumerable: true,
        value(name, handler) {
          _eventListeners[name] = _eventListeners[name] || [];
          if (!_eventListeners[name].find((h) => h === handler)) {
            _eventListeners[name].push(handler);
            _scheduleDispatch();
          }
        },
      },

      /**
       * Removes an event listener from ExtendedCloud instance.
       * @method removeEventListener
       * @param {string} name Event name.
       * @param {Function} handler Handler.
       */
      removeEventListener: {
        enumerable: true,
        value(name, handler) {
          const idx =
            _eventListeners[name]?.findIndex((h) => h === handler) ?? -1;
          if (idx >= 0) {
            _eventListeners[name].splice(idx, 1);
            if (_eventListeners[name].length <= 0) {
              delete _eventListeners[name];
            }
          }
        },
      },

      /**
       * Dispatches an event to all listeners on ExtendedCloud instance. If the
       *  event is already scheduled, its parameters are updated with the new
       *  ones given (even if none are given). This also serves as a way to
       *  de-duplicate events if the same event is dispatched multiple times
       *  in a row.
       * @private
       * @method dispatchEvent
       * @param {string} name Event name.
       * @param {Array} [params] Parameters to pass to each handler, if any.
       */
      dispatchEvent: {
        enumerable: false,
        value(name, ...params) {
          const event = _eventQueue.find((e) => e.name === name);
          if (event) {
            event.params = params;
            // don't schedule dispatch in this case because we wouldn't already
            //  scheduled it when the event was first added to the queue; we
            //  just haven't gotten to the next frame yet where we'll dispatch it
          } else {
            _eventQueue.push({ name, params });
            _scheduleDispatch();
          }
        },
      },

      /**
       * Removes all events in the queue without notifying listeners.
       */
      emptyEventQueue: {
        enumerable: false,
        value() {
          _eventQueue.length = 0;
        },
      },
    });

    let _loading = false; // initial load only
    let _fetching = false; // anytime we're fetching new data
    let _namespaces = null;
    let _cloud = null; // starts null, but once set, can never be null/undefined again
    let _error = null;

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
        } else {
          console.log(
            `####### ExtendedCloud.[set]cloud: NO CHANGE in cloud object`
          ); // DEBUG LOG
        }
      },
    });

    Object.defineProperty(this, 'loading', {
      enumerable: true,
      get() {
        return _loading;
      },
      set(newValue) {
        if (!!newValue !== _loading) {
          _loading = !!newValue;
          this.dispatchEvent(EXTENDED_CLOUD_EVENTS.LOADING_CHANGE, this);
        }
      },
    });

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

    Object.defineProperty(this, 'namespaces', {
      enumerable: true,
      get() {
        return _namespaces;
      },
      set(newValue) {
        if (newValue !== _namespaces) {
          _namespaces = newValue || null;
          console.log(
            `####### ExtendedCloud.[set]namespaces: Set new namespaces data for extCloud=${this}, namespaces=`,
            _namespaces
          ); // DEBUG LOG
          this.dispatchEvent(EXTENDED_CLOUD_EVENTS.DATA_UPDATED, this);
        }
      },
    });

    Object.defineProperty(this, 'error', {
      enumerable: true,
      get() {
        return _error;
      },
      set(newValue) {
        if (newValue !== _error) {
          _error = newValue || null;
          this.dispatchEvent(EXTENDED_CLOUD_EVENTS.DATA_UPDATED, this);
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
    }, FIVE_MIN);

    // schedule the initial data load/fetch
    this.dispatchEvent(EXTENDED_CLOUD_EVENTS.FETCH_DATA, this);
  }

  /** Called when this instance is being deleted/destroyed. */
  destroy() {
    console.log(`####### ExtendedCloud.destroy(): DESTROYING extCloud=${this}`); // DEBUG LOG

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

    if (!this.cloud?.isConnected()) {
      logger.log(
        'ExtendedCloud.fetchData()',
        `Cannot fetch data for extCloud=${this}: Cloud is ${
          this.cloud ? 'disconnected' : 'unknown'
        }`
      );
      return;
    }

    // undefined/null for BOTH implies we've never fetched at least once, so this
    //  must be the initial load
    this.loading = !this.namespaces && !this.error;
    this.fetching = true;

    logger.log(
      'ExtendedCloud.fetchData()',
      `Fetching data for extCloud=${this}`
    );

    // if no config (eg when we restore cloud from disk) try to load it
    if (!this.cloud?.config) {
      await this.cloud.loadConfig();
      // if loadConfig error we get it as connectError
      // in this case stop fetchData and set ExtendedCloud.error to that error
      if (this.cloud.connectError) {
        this.error = getErrorMessage(this.cloud.connectError);
        this.loading = false;
        this.fetching = false;
        return;
      }
    }

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
      // NOTE: in this case, we don't set `this.namespaces`, either leaving it
      //  unset (never successfully fetched at least once), or leaving it as its
      //  previous value so we don't lose the Cloud's last known state
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
      this.namespaces = nsResults.namespaces.map((name) => {
        const nameSpaceClusters = clusterResults.clusters.filter(
          (c) => c.namespace === name
        );
        const nameSpaceSshKeys =
          keyResults.sshKeys.find((key) => key.namespace === name)?.items || [];

        return {
          name,
          clusters: nameSpaceClusters,
          clustersCount: nameSpaceClusters.length,
          sshKeys: nameSpaceSshKeys,
          sshKeysCount: nameSpaceSshKeys.length,
          credentials: credResults.credentials[name],
        };
      });
    }

    this.loading = false;
    this.fetching = false;
  }

  /** @returns {string} String representation of this ExtendedCloud for logging/debugging. */
  toString() {
    return `{ExtendedCloud INSTANCE_ID: ${this.INSTANCE_ID}, cloud: ${
      this.cloud
    }, loading: ${this.loading}, fetching: ${this.fetching}, namespaces: ${
      this.namespaces ? '<set>' : 'undefined'
    }, error: ${this.error}}`;
  }
}
