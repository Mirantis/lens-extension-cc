import * as rtv from 'rtvjs';
import { Cloud, CLOUD_EVENTS } from './Cloud';
import { Namespace } from '../api/types/Namespace';
import {
  fetchNamespaces,
  fetchCredentials,
  fetchSshKeys,
  fetchProxies,
  fetchLicenses,
  fetchMachines,
  fetchClusters,
  fetchResourceEvents,
  fetchResourceUpdates,
} from '../api/apiFetch';
import { logger, logValue } from '../util/logger';
import { EventDispatcher } from './EventDispatcher';
import { ipcEvents } from '../constants';
import * as strings from '../strings';

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
   * @param {Object} params
   * @param {Cloud} params.cloud The Cloud that provides backing for the DataCloud to access
   *  the API and determines which namespaces are synced.
   * @param {IpcMain|IpcRenderer} params.ipc Singleton instance from either Main or Renderer thread.
   * @param {boolean} [params.preview] If truthy, declares this instance is only for preview
   *  purposes (i.e. not used for actual sync to the Catalog), which reduces the amount
   *  of data fetched from the Cloud in order to make data fetching much faster.
   */
  constructor({ cloud, ipc, preview = false }) {
    super();

    let _loaded = false; // true if we've fetched data at least once, successfully
    let _fetching = false; // anytime we're fetching new data
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

    ipc.listen(ipcEvents.broadcast.POWER_SUSPEND, () =>
      this.onSuspended(ipcEvents.broadcast.POWER_SUSPEND)
    );
    ipc.listen(ipcEvents.broadcast.POWER_RESUME, () =>
      this.onResumed(ipcEvents.broadcast.POWER_RESUME)
    );
    ipc.listen(ipcEvents.broadcast.NETWORK_OFFLINE, () =>
      this.onSuspended(ipcEvents.broadcast.NETWORK_OFFLINE)
    );
    ipc.listen(ipcEvents.broadcast.NETWORK_ONLINE, () =>
      this.onResumed(ipcEvents.broadcast.NETWORK_ONLINE)
    );
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
      this.fetchNow();
    }
  };

  /** Called when __this__ DataCloud should fetch new data from its Cloud. */
  onFetchData = () => this.fetchData();

  /**
   * Called when the system is getting suspended or network has been dropped.
   * @param {string} event IPC event name.
   */
  onSuspended = (event) => {
    if (this.polling) {
      logger.info(
        'DataCloud.onSuspended()',
        `Stopping interval until network/power restored; event=${logValue(
          event
        )}; dataCloud=${logValue(this.cloudUrl)}`
      );
      this.resetInterval(false);
    }
  };

  /**
   * Called after the system has been resumed (i.e. awakened from sleep).
   * @param {string} event IPC event name.
   */
  onResumed = (event) => {
    logger.info(
      'DataCloud.onResumed()',
      `Fetching full data to resume sync; event=${logValue(
        event
      )}; dataCloud=${logValue(this.cloudUrl)}`
    );
    this.dispatchEvent(DATA_CLOUD_EVENTS.FETCH_DATA);
  };

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

    // NOTE: we always fetch ALL namespaces (which should be quite cheap to do)
    //  since we need to discover new ones, and know when existing ones are removed
    const nsResults = await fetchNamespaces(this.cloud, this.preview);

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
      const resEventResults = await fetchResourceEvents(
        this.cloud,
        fetchedNamespaces
      );

      // NOTE: for now, we only get updates if Webpack enabled the special flag
      //  since they require MCC v2.22 which adds the expected `status` field
      //  to stage objects
      let resUpdateResults = {
        resourceUpdates: {},
        tokensRefreshed: false,
        errorsOccurred: false,
      };
      if (FEAT_CLUSTER_PAGE_HISTORY_ENABLED) {
        resUpdateResults = await fetchResourceUpdates(
          this.cloud,
          fetchedNamespaces
        );
      }

      const credResults = await fetchCredentials(this.cloud, fetchedNamespaces);
      const keyResults = await fetchSshKeys(this.cloud, fetchedNamespaces);
      const proxyResults = await fetchProxies(this.cloud, fetchedNamespaces);
      const licenseResults = await fetchLicenses(this.cloud, fetchedNamespaces);

      // map all the resources fetched so far into their respective Namespaces
      fetchedNamespaces.forEach((namespace) => {
        namespace.events = resEventResults.resourceEvents[namespace.name] || [];
        namespace.updates =
          resUpdateResults.resourceUpdates[namespace.name] || [];
        namespace.sshKeys = keyResults.sshKeys[namespace.name] || [];
        namespace.credentials = credResults.credentials[namespace.name] || [];
        namespace.proxies = proxyResults.proxies[namespace.name] || [];
        namespace.licenses = licenseResults.licenses[namespace.name] || [];
      });

      errorsOccurred =
        errorsOccurred ||
        resEventResults.errorsOccurred ||
        resUpdateResults.errorsOccurred ||
        credResults.errorsOccurred ||
        keyResults.errorsOccurred ||
        proxyResults.errorsOccurred ||
        licenseResults.errorsOccurred;

      // NOTE: fetch machines only AFTER licenses have been fetched and added
      //  into the Namespaces because the Machine resource expects to find Licenses
      const machineResults = await fetchMachines(this.cloud, fetchedNamespaces);
      // map fetched machines into their respective Namespaces
      fetchedNamespaces.forEach((namespace) => {
        namespace.machines = machineResults.machines[namespace.name] || [];
      });
      errorsOccurred = errorsOccurred || machineResults.errorsOccurred;

      // NOTE: fetch clusters only AFTER everything else has been fetched and added
      //  into the Namespaces because the Cluster resource expects to find all the
      //  other resources
      const clusterResults = await fetchClusters(this.cloud, fetchedNamespaces);
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
    }, polling: ${this.polling}, preview: ${this.preview}, namespaces: ${
      this.loaded ? this.namespaces.length : '-1'
    }, error: ${logValue(this.error)}, cloud: ${this.cloud}}`;
  }
}
