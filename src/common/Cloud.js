import * as rtv from 'rtvjs';
import { isEqualWith } from 'lodash';
import { request } from '../util/netUtil';
import { logger, logValue } from '../util/logger';
import * as strings from '../strings';
import * as ssoUtil from '../util/ssoUtil';
import {
  EXT_EVENT_OAUTH_CODE,
  extEventOauthCodeTs,
  addExtEventHandler,
  removeExtEventHandler,
} from '../common/eventBus';
import { EventDispatcher } from './EventDispatcher';
import * as apiUtil from '../api/apiUtil';
import { Namespace } from '../api/types/Namespace';
import { CloudConfig } from './CloudConfig';
import { CloudNamespace, cloudNamespaceTs } from './CloudNamespace';

/**
 * Determines if a date has passed.
 * @param {Date} [date]
 * @returns {boolean} True if the date has passed or is not a `Date`; false otherwise.
 */
const hasPassed = function (date) {
  return date instanceof Date ? date.getTime() - Date.now() < 0 : false;
};

/**
 * Formats a date for debugging/logging purposes.
 * @param {Date} [date]
 * @returns {string|any} Formatted date if `date` was a `Date`; the `date` as it was
 *  given if it's not a `Date`.
 */
const logDate = function (date) {
  if (date instanceof Date) {
    const offset = date.getTimezoneOffset() / 60;
    return `${date.getFullYear()}/${`${date.getMonth() + 1}`.padStart(
      2,
      '0'
    )}/${`${date.getDate()}`.padStart(2, '0')} ${`${date.getHours()}`.padStart(
      2,
      '0'
    )}:${`${date.getMinutes()}`.padStart(
      2,
      '0'
    )}:${`${date.getSeconds()}`.padStart(
      2,
      '0'
    )}.${date.getMilliseconds()} UTC${offset > 0 ? '-' : '+'}${offset}`;
  }

  return date;
};

/**
 * Deep-compares two CloudNamespaces when using `_.isEqualWith()`.
 * @param {CloudNamespace} [left]
 * @param {CloudNamespace} [right]
 * @returns {boolean} True if deep-equal; false if not.
 */
const compareCloudNamespaces = function (left, right) {
  if ((!left && right) || (left && !right)) {
    return false;
  }

  if (!left && !right) {
    return true;
  }

  return Object.keys(cloudNamespaceTs).every((key) => left[key] === right[key]);
};

export const CONNECTION_STATUSES = Object.freeze({
  /** Cloud has a config object and an API token, and the ability to refresh it when it expires. */
  CONNECTED: 'connected',
  /** Cloud does not have a token nor the ability to get a new one automatically. */
  DISCONNECTED: 'disconnected',
  /** Cloud is actively obtaining new API tokens from the Mgmt Cluster. */
  CONNECTING: 'connecting',
});

// Events dispatched by Cloud instances.
export const CLOUD_EVENTS = Object.freeze({
  /**
   * At least one of the Cloud's status-related properties has changed.
   *
   * NOTE: __Excludes__ `loaded` and `fetching` property changes.
   *
   * Expected signature: `(event: { name: string, target: Cloud }, info: { isFromStore: boolean }) => void`
   *
   * - `info.isFromStore`: True if the change is a result of a store (i.e. disk) change;
   *     false otherwise.
   */
  STATUS_CHANGE: 'statusChange',

  /**
   * The Cloud's `loaded` property has changed.
   *
   * Expected signature: `(event: { name: string, target: Cloud }, info: { isFromStore: boolean }) => void`
   *
   * - `info.isFromStore`: True if the change is a result of a store (i.e. disk) change;
   *     false otherwise.
   */
  LOADED_CHANGE: 'loadedChange',

  /**
   * The Cloud's `fetching` property has changed.
   *
   * Expected signature: `(event: { name: string, target: Cloud }, info: { isFromStore: boolean }) => void`
   *
   * - `info.isFromStore`: True if the change is a result of a store (i.e. disk) change;
   *     false otherwise.
   */
  FETCHING_CHANGE: 'fetchingChange',

  /**
   * At least one of the Cloud's token-related properties has changed, likely because
   *  the token expired and had to be refreshed, or because the Cloud had no tokens,
   *  connected to MCC, and obtained a new set.
   *
   * Expected signature: `(event: { name: string, target: Cloud }, info: { isFromStore: boolean }) => void`
   *
   * - `info.isFromStore`: True if the change is a result of a store (i.e. disk) change;
   *     false otherwise.
   */
  TOKEN_CHANGE: 'tokenChange',

  /**
   * At least one of the Cloud's sync-related properties has changed.
   *
   * Expected signature: `(event: { name: string, target: Cloud }, info: { isFromStore: boolean }) => void`
   *
   * - `info.isFromStore`: True if the change is a result of a store (i.e. disk) change;
   *     false otherwise.
   */
  SYNC_CHANGE: 'syncChange',

  /**
   * At least one of the Cloud's other properties has changed (not related to
   *  status, tokens, or sync). For example, its user-specified name.
   *
   * Expected signature: `(event: { name: string, target: Cloud }, info: { isFromStore: boolean }) => void`
   *
   * - `info.isFromStore`: True if the change is a result of a store (i.e. disk) change;
   *     false otherwise.
   */
  PROP_CHANGE: 'propChange',
});

/**
 * Loads the config object from the Mgmt Cluster.
 * @param {Cloud} cloud
 * @returns {Promise<CloudConfig>} The Mgmt cluster's config object as JSON if successful;
 *  rejects with an `Error` if not.
 */
const _loadConfig = async (cloud) => {
  const res = await request(
    `${cloud.cloudUrl}/config.js`,
    {},
    { extractBodyMethod: 'text', trustHost: cloud.trustHost }
  );
  if (res.error) {
    throw new Error(res.error);
  } else {
    const content = res.body
      .replace(/^window\.CONFIG\s*=\s*{/, '{')
      .replace('};', '}');

    try {
      return new CloudConfig({
        cloudUrl: cloud.cloudUrl,
        trustHost: cloud.trustHost,
        config: JSON.parse(content),
      });
    } catch (err) {
      logger.error(
        'Cloud._loadConfig()',
        `Failed to parse config, error="${err.message}"`
      );
      if (err.message.match(/^unexpected token/i)) {
        throw new Error(strings.cloud.error.unexpectedToken());
      } else {
        throw new Error(err.message);
      }
    }
  }
};

/**
 * Represents a connection to a single MCC instance (i.e. Management Cluster),
 * including access tokens and expiry times.
 * @class Cloud
 */
export class Cloud extends EventDispatcher {
  /** @static {Object} RTV Typeset (shape) for an API tokens payload. */
  static tokensTs = {
    // NOTE: all token properties are required because this is the expectation when
    //  tokens are being updated (see `Cloud.updateTokens()`)
    id_token: [rtv.REQUIRED, rtv.STRING],
    expires_in: [rtv.REQUIRED, rtv.SAFE_INT], // SECONDS valid from now
    refresh_token: [rtv.REQUIRED, rtv.STRING],
    refresh_expires_in: [rtv.REQUIRED, rtv.SAFE_INT], // SECONDS valid from now

    // NOTE: These properties are important because `expires_in` and `refresh_expires_in`
    //  are just offsets from when the tokens were obtained, and on disk, that tells us
    //  nothing; we need the actual expiry date/time so that if Lens is quit and opened
    //  at a later time, we can know if the tokens are still valid.
    // They are marked OPTIONAL because they don't come from the server, only from JSON.
    tokenExpiresAt: [rtv.OPTIONAL, rtv.SAFE_INT],
    refreshExpiresAt: [rtv.OPTIONAL, rtv.SAFE_INT],
  };

  /** @static {Object} RTV Typeset (shape) for a new Cloud instance. */
  static specTs = {
    // all token properties can be `null` in the overall Cloud spec because a Cloud
    //  doesn't always have tokens
    ...Object.keys(Cloud.tokensTs).reduce((ts, key) => {
      ts[key] = Cloud.tokensTs[key].concat(); // shallow clone of property typeset

      if (ts[key][0] === rtv.REQUIRED) {
        // each API property becomes expected, which means it can be `null`, which
        //  supports restoring from disk in CloudStore and creating new Cloud instances
        //  prior to having tokens
        ts[key][0] = rtv.EXPECTED;
      }

      return ts;
    }, {}),

    username: [rtv.EXPECTED, rtv.STRING], // username used to obtain tokens; null if no tokens
    cloudUrl: [rtv.STRING, (v) => !v.endsWith('/')], // URL to the MCC instance (no trailing slash)
    name: rtv.STRING, // user-assigned name
    offlineAccess: [rtv.OPTIONAL, rtv.BOOLEAN], // optional for backward compatibility
    trustHost: [rtv.OPTIONAL, rtv.BOOLEAN], // optional for backward compatibility
    connectError: [rtv.OPTIONAL, rtv.STRING],
    syncAll: rtv.BOOLEAN,
    namespaces: [[cloudNamespaceTs]], // all known namespaces, synced or ignored
  };

  /**
   * @constructor
   * @param {string|Object} urlOrSpec Either the URL for the mgmt cluster (must not end
   *  with a slash ('/')), or an object that matches the `specTs` Typeset and contains
   *  multiple properties to initialize the Cloud (including the URL).
   * @param {IpcMain} [ipcMain] Reference to the IpcMain singleton instance on the MAIN
   *  thread, if this Cloud instance is being created on the MAIN thread; `undefined`
   *  otherwise.
   */
  constructor(urlOrSpec, ipcMain) {
    super();

    const cloudUrl =
      typeof urlOrSpec === 'string' ? urlOrSpec : urlOrSpec.cloudUrl;

    DEV_ENV && rtv.verify({ cloudUrl }, { cloudUrl: Cloud.specTs.cloudUrl });

    // NOTE: `spec` is validated after all properties are declared via `this.update(spec)`
    //  only if it was given

    let _name = null;
    let _offlineAccess = false;
    let _trustHost = false;
    let _syncAll = false;
    let _namespaces = {}; // map of name to CloudNamespace for internal efficiency
    let _syncedProjects = []; // cached from _namespaces for performance
    let _ignoredProjects = []; // cached from _namespaces for performance
    let _token = null;
    let _expiresIn = null;
    let _tokenValidTill = null;
    let _refreshToken = null;
    let _refreshExpiresIn = null;
    let _refreshTokenValidTill = null;
    let _username = null;
    let _config = null;
    let _connectError = null;
    let _connecting = false;
    let _loaded = false;
    let _fetching = false;

    // true if this Cloud's properties are currently being updated via `Cloud.update()`
    //  resulting from a change in the CloudStore
    let _updatingFromStore = false;

    /**
     * @member {string} name The "friendly name" given to the mgmt cluster by
     * the user when they will add new mgmt clusters to the extension.
     */
    Object.defineProperty(this, 'name', {
      enumerable: true,
      get() {
        return _name;
      },
      set(newValue) {
        DEV_ENV && rtv.verify({ name: newValue }, { name: Cloud.specTs.name });
        if (_name !== newValue) {
          _name = newValue;
          this.dispatchEvent(CLOUD_EVENTS.PROP_CHANGE, {
            isFromStore: _updatingFromStore,
          });
        }
      },
    });

    /**
     * @member {boolean} offlineAccess True if TLS verification should be disabled for this host;
     *  false if it should be enabled.
     */
    Object.defineProperty(this, 'offlineAccess', {
      enumerable: true,
      get() {
        return _offlineAccess;
      },
      set(newValue) {
        DEV_ENV &&
          rtv.verify(
            { offlineAccess: newValue },
            { offlineAccess: Cloud.specTs.offlineAccess }
          );
        const newBool = !!newValue; // due to backward compatibility, could be null/undefined/boolean
        if (_offlineAccess !== newBool) {
          _offlineAccess = newBool;
          // NOTE: considered a sync-related change because changing this setting must result in
          //  generating new kubeconfigs for all synced clusters
          this.dispatchEvent(CLOUD_EVENTS.SYNC_CHANGE, {
            isFromStore: _updatingFromStore,
          });
        }
      },
    });

    /**
     * @member {boolean} trustHost True if TLS verification should be disabled for this host;
     *  false if it should be enabled.
     */
    Object.defineProperty(this, 'trustHost', {
      enumerable: true,
      get() {
        return _trustHost;
      },
      set(newValue) {
        DEV_ENV &&
          rtv.verify(
            { trustHost: newValue },
            { trustHost: Cloud.specTs.trustHost }
          );
        const newBool = !!newValue; // due to backward compatibility, could be null/undefined/boolean
        if (_trustHost !== newBool) {
          _trustHost = newBool;
          // NOTE: considered a sync-related change because it affects how we connect to the
          //  host when syncing, and if we allowed changing this setting in the UI, we would
          //  have to put the configuration UI in the Selective Sync View (which is sync-related)
          this.dispatchEvent(CLOUD_EVENTS.SYNC_CHANGE, {
            isFromStore: _updatingFromStore,
          });
        }
      },
    });

    /**
     * @member {boolean} syncAll True if the user chooses to sync all namespaces in
     *  a mgmt cluster, or false if they pick individual namespaces.
     */
    Object.defineProperty(this, 'syncAll', {
      enumerable: true,
      get() {
        return _syncAll;
      },
      set(newValue) {
        DEV_ENV &&
          rtv.verify({ syncAll: newValue }, { syncAll: Cloud.specTs.syncAll });
        if (_syncAll !== newValue) {
          _syncAll = newValue;
          this.dispatchEvent(CLOUD_EVENTS.SYNC_CHANGE, {
            isFromStore: _updatingFromStore,
          });
        }
      },
    });

    /**
     * @readonly
     * @member {Array<string>} syncedProjects A simple list of namespace __names__ in
     *  the mgmt cluster that are being synced.
     */
    Object.defineProperty(this, 'syncedProjects', {
      enumerable: true,
      get() {
        return _syncedProjects;
      },
    });

    /**
     * @readonly
     * @member {Array<string>} ignoredProjects A simple list of namespace __names__ in
     *  the mgmt cluster that __not__ being synced.
     */
    Object.defineProperty(this, 'ignoredProjects', {
      enumerable: true,
      get() {
        return _ignoredProjects;
      },
    });

    /**
     * @readonly
     * @member {Array<string>} allProjects Full list of all known namespace __names__.
     *  `syncedProjects` + `ignoredProjects` in one list.
     */
    Object.defineProperty(this, 'allProjects', {
      enumerable: true,
      get() {
        return [..._syncedProjects, ..._ignoredProjects];
      },
    });

    /**
     * @readonly
     * @member {Array<CloudNamespace>} namespaces All known namespaces in this Cloud.
     */
    Object.defineProperty(this, 'namespaces', {
      enumerable: true,
      get() {
        return Object.values(_namespaces);
      },
    });

    /**
     * @readonly
     * @member {Array<CloudNamespace>} syncedNamespaces Only known __synced__ namespaces
     *  in this Cloud.
     */
    Object.defineProperty(this, 'syncedNamespaces', {
      enumerable: true,
      get() {
        return this.namespaces.filter((ns) => ns.synced);
      },
    });

    /**
     * @member {boolean} loaded True if this Cloud's data has been successfully fetched
     *  at least once. Once true, doesn't change again. Use `#fetching` instead for
     *  periodic data fetch state.
     */
    Object.defineProperty(this, 'loaded', {
      enumerable: true,
      get() {
        return _loaded;
      },
      set(newValue) {
        if (_loaded !== !!newValue) {
          _loaded = !!newValue;
          this.dispatchEvent(CLOUD_EVENTS.LOADED_CHANGE, {
            isFromStore: _updatingFromStore,
          });
          ipcMain?.notifyCloudLoadedChange(this.cloudUrl, _loaded);
        }
      },
    });

    /**
     * @member {boolean} fetching True if this Cloud's data is actively being fetched
     *  (e.g. by the SyncManager).
     */
    Object.defineProperty(this, 'fetching', {
      enumerable: true,
      get() {
        return _fetching;
      },
      set(newValue) {
        if (_fetching !== !!newValue) {
          _fetching = !!newValue;
          this.dispatchEvent(CLOUD_EVENTS.FETCHING_CHANGE, {
            isFromStore: _updatingFromStore,
          });
          ipcMain?.notifyCloudFetchingChange(this.cloudUrl, _fetching);
        }
      },
    });

    /** @member {boolean} connecting True if this Cloud is currently trying to connect to MCC. */
    Object.defineProperty(this, 'connecting', {
      enumerable: true,
      get() {
        return _connecting;
      },
      set(newValue) {
        if (_connecting !== !!newValue) {
          _connecting = !!newValue;
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, {
            isFromStore: _updatingFromStore,
          });
          ipcMain?.notifyCloudStatusChange(this.cloudUrl, {
            connecting: _connecting,
            connectError: this.connectError,
          });
        }
      },
    });

    /**
     * Most recent connection error.
     *
     * 💬 Setter accepts either `null`, a `string`, or an `Error`, but getter is always
     *  either `null|string`.
     *
     * @member {string|null} connectError
     */
    Object.defineProperty(this, 'connectError', {
      enumerable: true,
      get() {
        return _connectError;
      },
      set(newValue) {
        const validValue =
          (newValue instanceof Error ? newValue.message : newValue) || null;
        DEV_ENV &&
          rtv.verify(
            { validValue },
            { validValue: [rtv.EXPECTED, rtv.STRING] }
          );
        if (validValue !== _connectError) {
          _connectError = validValue || null;
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, {
            isFromStore: _updatingFromStore,
          });
          // NOTE: `connectError` is written to the CloudStore as JSON so there's no
          //  need to notify over IPC when it changes; this is primarily done because
          //  when Lens starts up and we attempt to reconnect to all Clouds on MAIN, if
          //  we hit a connection error and rely on IPC to communicate that to the RENDERER,
          //  the RENDERER will likely __miss__ the notification because it hasn't started
          //  listening for IPC events yet; the only sure way to get the "message" accross
          //  is to go to disk via the CloudStore
        }
      },
    });

    /**
     * @readonly
     * @member {string} status One of the `CONNECTION_STATUSES` enum values.
     */
    Object.defineProperty(this, 'status', {
      enumerable: true,
      get() {
        if (this.connecting) {
          return CONNECTION_STATUSES.CONNECTING;
        }

        // we're not truly connected to the Cloud unless there's no error, we have
        //  a config (can't make API calls without it), we have an API token, and
        //  we have the ability to refresh it when it expires
        if (!this.connectError && this.token && this.refreshTokenValid) {
          // If we're on MAIN and all we're missing is the config, claim we're "connecting"
          //  because we most likely just restored this Cloud from disk after opening Lens,
          //  and we just haven't attempted to fetch the config yet as part of a data fetch.
          // If we're on RENDERER (where we MAY never connect other than for preview purposes),
          //  then we MAY never have a config so we can't consider this implied 'connecting'
          //  state -- unless the `config` is `undefined`, indicating it's being loaded, which
          //  is triggered by the CloudStore on RENDERER only in order to make sure that all
          //  Clouds have loaded configs so they are usable on RENDERER even though they're
          //  being "driven" by MAIN. This is necessary for things like the
          //  'Cluster Page > Health Panel' that needs to connect to the Prometheus APIs
          //  and so needs a config because it may need to refresh tokens.
          // NOTE: a Cloud's status on RENDERER is simply driven by IPC events from MAIN
          //  (sent by the sibling Cloud instance there) via the CloudProvider purely for
          //  cosmetic purposes so that the user can see if the Cloud is connected, refreshing,
          //  etc.
          if (
            (ipcMain && !this.config) ||
            (!ipcMain && this.config === undefined)
          ) {
            return CONNECTION_STATUSES.CONNECTING;
          }

          return CONNECTION_STATUSES.CONNECTED;
        }

        return CONNECTION_STATUSES.DISCONNECTED;
      },
    });

    /**
     * @member {undefined|null|Object} config Mgmt cluster config object. When truthy, the
     *  Config is loaded. When `null`, it's not loaded (either not attempted or failed due
     *  to a `connectError`). When `undefined`, it's in the process of loading.
     */
    Object.defineProperty(this, 'config', {
      enumerable: true,
      get() {
        return _config;
      },
      set(newValue) {
        DEV_ENV &&
          rtv.verify(
            { config: newValue },
            {
              config: [rtv.OPTIONAL, rtv.CLASS_OBJECT, { ctor: CloudConfig }],
            }
          );
        if (newValue !== _config) {
          _config = newValue; // object/null/undefined
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, {
            isFromStore: _updatingFromStore,
          }); // affects status
        }
      },
    });

    /** @member {string|null} token */
    Object.defineProperty(this, 'token', {
      enumerable: true,
      get() {
        return _token;
      },
      set(newValue) {
        DEV_ENV &&
          rtv.verify({ token: newValue }, { token: Cloud.specTs.id_token });
        if (_token !== newValue) {
          _token = newValue || null; // normalize empty to null
          this.dispatchEvent(CLOUD_EVENTS.TOKEN_CHANGE, {
            isFromStore: _updatingFromStore,
          });
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, {
            isFromStore: _updatingFromStore,
          }); // tokens affect status
        }
      },
    });

    /** @member {number|null} expiresIn __Seconds__ until expiry from time acquired. */
    Object.defineProperty(this, 'expiresIn', {
      enumerable: true,
      get() {
        return _expiresIn;
      },
      set(newValue) {
        DEV_ENV &&
          rtv.verify(
            { expiresIn: newValue },
            { expiresIn: Cloud.specTs.expires_in }
          );
        if (_expiresIn !== newValue) {
          _expiresIn = newValue;
          this.dispatchEvent(CLOUD_EVENTS.TOKEN_CHANGE, {
            isFromStore: _updatingFromStore,
          });
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, {
            isFromStore: _updatingFromStore,
          }); // tokens affect status
        }
      },
    });

    /** @member {Date|null} tokenValidTill */
    Object.defineProperty(this, 'tokenValidTill', {
      enumerable: true,
      get() {
        return _tokenValidTill;
      },
      set(newValue) {
        DEV_ENV &&
          rtv.verify(
            { tokenValidTill: newValue },
            { tokenValidTill: [rtv.EXPECTED, rtv.DATE] }
          );
        if (_tokenValidTill !== newValue) {
          _tokenValidTill = newValue;
          this.dispatchEvent(CLOUD_EVENTS.TOKEN_CHANGE, {
            isFromStore: _updatingFromStore,
          });
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, {
            isFromStore: _updatingFromStore,
          }); // tokens affect status
        }
      },
    });

    /** @member {string|null} refreshToken */
    Object.defineProperty(this, 'refreshToken', {
      enumerable: true,
      get() {
        return _refreshToken;
      },
      set(newValue) {
        DEV_ENV &&
          rtv.verify(
            { refreshToken: newValue },
            { refreshToken: Cloud.specTs.refresh_token }
          );
        if (_refreshToken !== newValue) {
          _refreshToken = newValue || null; // normalize empty to null
          this.dispatchEvent(CLOUD_EVENTS.TOKEN_CHANGE, {
            isFromStore: _updatingFromStore,
          });
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, {
            isFromStore: _updatingFromStore,
          }); // tokens affect status
        }
      },
    });

    /** @member {number|null} refreshExpiresIn __Seconds__ until expiry from time acquired. */
    Object.defineProperty(this, 'refreshExpiresIn', {
      enumerable: true,
      get() {
        return _refreshExpiresIn;
      },
      set(newValue) {
        DEV_ENV &&
          rtv.verify(
            { refreshExpiresIn: newValue },
            { refreshExpiresIn: Cloud.specTs.refresh_expires_in }
          );
        if (_refreshExpiresIn !== newValue) {
          _refreshExpiresIn = newValue;
          this.dispatchEvent(CLOUD_EVENTS.TOKEN_CHANGE, {
            isFromStore: _updatingFromStore,
          });
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, {
            isFromStore: _updatingFromStore,
          }); // tokens affect status
        }
      },
    });

    /** @member {Date|null} refreshTokenValidTill */
    Object.defineProperty(this, 'refreshTokenValidTill', {
      enumerable: true,
      get() {
        return _refreshTokenValidTill;
      },
      set(newValue) {
        DEV_ENV &&
          rtv.verify(
            { refreshTokenValidTill: newValue },
            { refreshTokenValidTill: [rtv.EXPECTED, rtv.DATE] }
          );
        if (_refreshTokenValidTill !== newValue) {
          _refreshTokenValidTill = newValue;
          this.dispatchEvent(CLOUD_EVENTS.TOKEN_CHANGE, {
            isFromStore: _updatingFromStore,
          });
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, {
            isFromStore: _updatingFromStore,
          }); // tokens affect status
        }
      },
    });

    /** @member {string|null} username */
    Object.defineProperty(this, 'username', {
      enumerable: true,
      get() {
        return _username;
      },
      set(newValue) {
        DEV_ENV &&
          rtv.verify(
            { username: newValue },
            { username: Cloud.specTs.username }
          );
        if (_username !== newValue) {
          _username = newValue || null; // normalize empty to null
          this.dispatchEvent(CLOUD_EVENTS.TOKEN_CHANGE, {
            isFromStore: _updatingFromStore,
          }); // related to tokens but not status
        }
      },
    });

    /**
     * @member {string|null} cloudUrl
     */
    Object.defineProperty(this, 'cloudUrl', {
      enumerable: true,
      get() {
        return cloudUrl;
      },
    });

    /**
     * Replaces the Cloud's list of namespaces given an entirely new set. The `syncAll` flag
     *  is __ignored__.
     * @method
     * @param {Array<CloudNamespace|Object>} newNamespaces New namespaces, typically from disk
     *  as plain objects with the `cloudNamespaceTs` shape.
     */
    Object.defineProperty(this, 'replaceNamespaces', {
      // non-enumerable since normally, methods are hidden on the prototype, but in this case,
      //  since we require the private context of the constructor, we have to define it on
      //  the instance itself
      enumerable: false,
      value: function (newNamespaces) {
        DEV_ENV &&
          rtv.verify(
            { newNamespaces },
            { newNamespaces: Cloud.specTs.namespaces }
          );

        // reset since we're getting new set of namespaces
        _namespaces = {};
        _syncedProjects = [];
        _ignoredProjects = [];

        newNamespaces.forEach((ns) => {
          const newCns = new CloudNamespace({
            cloudUrl: this.cloudUrl,
            name: ns,
          });

          if (newCns.synced) {
            _syncedProjects.push(newCns.name);
          } else {
            _ignoredProjects.push(newCns.name);
          }

          _namespaces[newCns.name] = newCns;
        });

        this.dispatchEvent(CLOUD_EVENTS.SYNC_CHANGE, {
          isFromStore: _updatingFromStore,
        });
      },
    });

    /**
     * Updates the Cloud's list of namespaces given all known namespaces and the Cloud's
     *  `syncAll` flag (i.e. add any new namespaces to its synced or ignored list, remove
     *  any old ones, and update ones that have had count changes).
     * @method
     * @param {Array<Namespace>} fetchedNamespaces All existing/known namespaces from the
     *  latest data fetch.
     */
    Object.defineProperty(this, 'updateNamespaces', {
      // non-enumerable since normally, methods are hidden on the prototype, but in this case,
      //  since we require the private context of the constructor, we have to define it on
      //  the instance itself
      enumerable: false,
      value: function (fetchedNamespaces) {
        DEV_ENV &&
          rtv.verify(
            { fetchedNamespaces },
            { fetchedNamespaces: [[rtv.CLASS_OBJECT, { $: Namespace }]] }
          );

        const oldNamespaces = { ..._namespaces };
        const syncedList = [];
        const ignoredList = [];
        let changed = false;

        _namespaces = {}; // reset since we're getting new set of known namespaces

        fetchedNamespaces.forEach((ns) => {
          let synced = false;

          if (this.syncAll) {
            if (this.ignoredProjects.includes(ns.name)) {
              ignoredList.push(ns.name); // keep ignoring it (explicitly ignored)
            } else {
              synced = true;
              syncedList.push(ns.name); // sync it (newly discovered)
            }
          } else {
            if (this.syncedProjects.includes(ns.name)) {
              synced = true;
              syncedList.push(ns.name); // keep syncing it
            } else {
              ignoredList.push(ns.name); // ignore it (newly discovered)
            }
          }

          const newCns = new CloudNamespace({
            cloudUrl: this.cloudUrl,
            name: ns,
            synced,
          });

          // DEEP-compare existing to new so we only notify of SYNC_CHANGE if something
          //  about the namespace has really changed (especially in the case where we
          //  were already syncing it); this will also work if we don't know about
          //  this namespace yet
          if (
            isEqualWith(oldNamespaces[ns.name], newCns, compareCloudNamespaces)
          ) {
            // no changes: use old/existing one since it's deep-equal
            _namespaces[ns.name] = oldNamespaces[ns.name];
          } else {
            changed = true;
            _namespaces[ns.name] = newCns;
          }
        });

        // check to see if any old namespaces have been removed
        changed ||= Object.keys(oldNamespaces).some(
          (name) => !_namespaces[name]
        );

        _syncedProjects = syncedList;
        _ignoredProjects = ignoredList;

        if (changed) {
          this.dispatchEvent(CLOUD_EVENTS.SYNC_CHANGE, {
            isFromStore: _updatingFromStore,
          });
        }
      },
    });

    /**
     * Updates the Cloud's synced and ignored namespace __names__.
     * @method
     * @param {Array<string>} syncedList A list of namespace __names__ in the mgmt cluster that
     *  should be synced.
     * @param {Array<string>} ignoredList A list of namespace __names__ in the mgmt cluster that
     *  should not be synced.
     * @throws {Error} If either list contains a namespace __name__ that is not already in
     *  the list of all known namespaces in this Cloud.
     */
    Object.defineProperty(this, 'updateSyncedProjects', {
      // non-enumerable since normally, methods are hidden on the prototype, but in this case,
      //  since we bind to the private context of the constructor, we have to define it on
      //  the instance itself
      enumerable: false,
      value: function (syncedList, ignoredList) {
        DEV_ENV &&
          rtv.verify(
            { syncedList, ignoredList },
            {
              syncedList: [[rtv.STRING]],
              ignoredList: [[rtv.STRING]],
            }
          );

        let changed = false;

        syncedList.forEach((name) => {
          if (!_namespaces[name]) {
            throw new Error(
              `Cannot add unknown namespace ${logValue(
                name
              )} to synced set in cloud=${logValue(this.cloudUrl)}`
            );
          }

          if (!_namespaces[name].synced) {
            // wasn't synced before and now will be
            _namespaces[name].synced = true;
            changed = true;
          }
        });

        ignoredList.forEach((name) => {
          if (!_namespaces[name]) {
            throw new Error(
              `Cannot add unknown namespace ${logValue(
                name
              )} to ignored set in cloud=${logValue(this.cloudUrl)}`
            );
          }

          if (_namespaces[name].synced) {
            // was synced before and now will be ignored
            _namespaces[name].synced = false;
            changed = true;
          }
        });

        _syncedProjects = syncedList;
        _ignoredProjects = ignoredList;

        if (changed) {
          this.dispatchEvent(CLOUD_EVENTS.SYNC_CHANGE, {
            isFromStore: _updatingFromStore,
          });
        }
      },
    });

    /**
     * Updates this Cloud given a JSON model matching `Cloud.specTs`, typically originating
     *  from disk. This is basically like calling the constructor, just that it updates this
     *  instance's properties (if changes have occurred) rather than creating a new instance.
     *  Change events are triggered as needed.
     * @method
     * @param {Object} spec JSON object. Must match the `Cloud.specTs` shape.
     * @param {boolean} [isFromStore] Set to true if this update is emanating from disk. This
     *  is important, as any change events fired as a result will have its `info.isFromStore`
     *  flag set to `true` to help prevent circular/endless store updates from Mobx reactions
     *  on both MAIN and RENDERER threads.
     * @returns {Cloud} This instance, for chaining/convenience.
     * @throws {Error} If `spec.cloudUrl` is different from this Cloud's `cloudUrl`.
     *  Don't re-used Clouds. Destroy them and create new ones instead.
     */
    Object.defineProperty(this, 'update', {
      // non-enumerable since normally, methods are hidden on the prototype, but in this case,
      //  since we bind to the private context of the constructor, we have to define it on
      //  the instance itself
      enumerable: false,
      value: function (spec, isFromStore = false) {
        DEV_ENV && rtv.verify({ spec }, { spec: Cloud.specTs });

        if (spec.cloudUrl !== this.cloudUrl) {
          throw new Error(
            `cloudUrl cannot be changed; spec.cloudUrl=${logValue(
              spec.cloudUrl
            )}, cloud=${logValue(this.cloudUrl)}`
          );
        }

        _updatingFromStore = !!isFromStore;

        this.name = spec.name;
        this.offlineAccess = spec.offlineAccess;
        this.trustHost = spec.trustHost;
        this.syncAll = spec.syncAll;
        this.replaceNamespaces(spec.namespaces);
        this.username = spec.username;
        this.connectError = spec.connectError || null;

        if (spec.id_token && spec.refresh_token) {
          this.updateTokens(spec);
        } else {
          this.resetTokens();
        }

        _updatingFromStore = false;

        return this;
      },
    });

    //// initialize

    if (typeof urlOrSpec !== 'string') {
      this.update(urlOrSpec);
    }

    // since we assign properties when initializing, and this may cause some events
    //  to get dispatched, make sure we start with a clean slate for any listeners
    //  that get added to this new instance we just constructed
    this.emptyEventQueue();
  }

  /**
   * @member {boolean} connected True if the Cloud's `status` is
   *  `CONNECTION_STATUSES.CONNECTED`; false otherwise.
   */
  get connected() {
    return this.status === CONNECTION_STATUSES.CONNECTED;
  }

  /**
   * @member {boolean} tokenValid True if the Cloud has a token that has not expired.
   */
  get tokenValid() {
    return !!this.token && !hasPassed(this.tokenValidTill);
  }

  /**
   * @returns {boolean} True if the Cloud has a `refreshToken` and it has not expired;
   *  false otherwise.
   */
  get refreshTokenValid() {
    return !!this.refreshToken && !hasPassed(this.refreshTokenValidTill);
  }

  /**
   * Clears all properties that are token-related. Use this if all tokens have expired,
   *  for example.
   */
  resetTokens() {
    this.token = null;
    this.expiresIn = null;
    this.tokenValidTill = null;

    this.refreshToken = null;
    this.refreshExpiresIn = null;
    this.refreshTokenValidTill = null;

    // tokens are tied to the user, so clear that too
    this.username = null;

    logger.log('Cloud.resetTokens()', `Tokens reset; cloud=${this}`);
  }

  /**
   * Update only tokens and expiries from an API response.
   * @param {Object} tokens API token payload. See `tokensTs` for expected shape.
   */
  updateTokens(tokens) {
    DEV_ENV && rtv.verify({ tokens }, { tokens: Cloud.tokensTs });

    const now = Date.now();

    this.token = tokens.id_token;
    this.expiresIn = tokens.expires_in; // SECONDS

    // SECURITY: Be aware that since 3 parties are involved in issuing tokens
    //  (Keycloak, the issuer; ENZI, the provider; this, the client), clock skew
    //  must be accounted for between the issuer and provider so they can "agree"
    //  on the expiry time, which means it's likely that the token will remain
    //  valid __beyond__ the expected local expiry time, possibly about twice
    //  as long as what appears to be the validity window. Same likely goes for
    //  the refresh token's expiry, which may be slightly longer (but not double)
    //  what it appears to be locally.

    if (typeof tokens.tokenExpiresAt === 'number') {
      // since we have this, we're likely restoring from JSON (from disk) after a long
      //  time: use this to calculate until when tokens are valid instead of just using
      //  the relative offset in `this.expiresIn` without a reference time
      this.tokenValidTill = new Date(tokens.tokenExpiresAt);
    } else {
      this.tokenValidTill = new Date(now + this.expiresIn * 1000);
    }

    this.refreshToken = tokens.refresh_token;
    this.refreshExpiresIn = tokens.refresh_expires_in; // SECONDS

    if (typeof tokens.refreshExpiresAt === 'number') {
      // since we have this, we're likely restoring from JSON (from disk) after a long
      //  time: use this to calculate until when tokens are valid instead of just using
      //  the relative offset in `this.refreshExpiresIn` without a reference time
      this.refreshTokenValidTill = new Date(tokens.refreshExpiresAt);
    } else {
      this.refreshTokenValidTill = new Date(now + this.refreshExpiresIn * 1000);
    }

    logger.log('Cloud.updateTokens()', `Tokens updated; cloud=${this}`);
  }

  /**
   * Serializes this instance to a JSON object for storage. Called automatically
   *  by `JSON.stringify(cloud)`.
   * @returns {Object} This object can subsequently be used as a `spec` object
   *  to create a new `Cloud` instance.
   */
  toJSON() {
    return {
      cloudUrl: this.cloudUrl,
      name: this.name,
      offlineAccess: this.offlineAccess,
      trustHost: this.trustHost,
      syncAll: this.syncAll,
      username: this.username,

      // NOTE: `connectError` is written to the CloudStore as JSON primarily because
      //  when Lens starts up and we attempt to reconnect to all Clouds on MAIN, if
      //  we hit a connection error and rely on IPC to communicate that to the RENDERER,
      //  the RENDERER will likely __miss__ the notification because it hasn't started
      //  listening for IPC events yet; the only sure way to get the "message" accross
      //  is to go to disk via the CloudStore
      connectError: this.connectError,

      // NOTE: we intentionally don't store `loading` and `fetching` state (we use
      //  IPC from MAIN -> RENDERER to communicate this state instead of trying to
      //  use the CloudStore because using the store results in endless read/write
      //  loops whenever the state changes, and we don't need to retain it on disk
      //  anyway since we reset it anytime Lens/extension restarts)

      // NOTE: the API-related properties have underscores in them since they do
      //  when they're coming from the MCC API

      // NOTE: the properties that __begin__ with an underscore are only written
      //  to JSON (never read); this is for easier debugging when looking at the
      //  data written on disk by the CloudStore; we don't actually use these
      //  properties anywhere (it's just easier to see a timestamp in local time
      //  than to just see the expiry in milliseconds)

      id_token: this.token,
      expires_in: this.expiresIn,
      tokenExpiresAt: this.tokenValidTill?.getTime() ?? null,
      _tokenValidTill: this.tokenValidTill?.toString() || null,

      refresh_token: this.refreshToken,
      refresh_expires_in: this.refreshExpiresIn,
      refreshExpiresAt: this.refreshTokenValidTill?.getTime() ?? null,
      _refreshValidTill: this.refreshTokenValidTill?.toString() || null,

      // list namespaces LAST since JSON gets printed in property order here and
      //  this could be a long list; printing at the end ensures we can more quickly
      //  read all the other properties when looking at the file for debugging
      namespaces: this.namespaces,
    };
  }

  /** @returns {string} String representation of this Cloud for logging/debugging. */
  toString() {
    const validTillStr = logDate(this.tokenValidTill);
    return `{Cloud name: ${logValue(this.name)}, url: ${logValue(
      this.cloudUrl
    )}, trusted: ${this.trustHost}, status: ${logValue(this.status)}, loaded: ${
      this.loaded
    }, fetching: ${this.fetching}, sync: ${this.syncedProjects.length}/${
      this.allProjects.length
    }, all: ${this.syncAll}, token: ${
      this.token
        ? `"${this.token.slice(0, 15)}..${this.token.slice(-15)}"`
        : this.token
    }, valid: ${this.tokenValid}, validTill: ${
      validTillStr ? `"${validTillStr}"` : validTillStr
    }, refreshValid: ${this.refreshTokenValid}, offlineAccess: ${
      this.offlineAccess
    }, config: ${
      this.config ? '<obj>' : logValue(this.config)
    }, connectError: ${logValue(this.connectError)}}`;
  }

  /**
   * Loads the Cloud's config object. On failure, the promise still succeeds, but
   *  the `connectError` property is updated with an error message.
   * @param {boolean} [later] If true, the `config` property will changed to `undefined`
   *  while loading, and then will settle on either an object (if successfully loaded)
   *  or `null` if an error occurred. If false, the `config` property is only updated
   *  if it's successfully (re)loaded. Either way, the `connectError` property is
   *  updated according to the results.
   * @returns {Promise} This promise always succeeds.
   */
  async loadConfig(later = false) {
    if (later) {
      this.config = undefined; // indicate loading
    }

    try {
      this.config = await _loadConfig(this);
      this.connectError = null;
      logger.log(
        'Cloud.loadConfig()',
        `Config loaded; later=${logValue(later)}, cloud=${this}`
      );
    } catch (err) {
      if (later) {
        this.config = null; // indicate no longer loading
      }
      this.connectError = err;
      logger.error(
        'Cloud.loadConfig()',
        `Failed to load config; error=${logValue(err)}, later=${logValue(
          later
        )}, cloud=${this}`
      );
    }
  }

  /**
   * Connects to the Cloud, obtaining the `config` and API tokens.
   *
   * __WARNING:__ This method returns before the connection is established because
   *  it must wait for the user to go through SSO steps in their browser. Subscribe
   *  to `STATUS_CHANGE` events to get notified when the connection status has changed,
   *  and use the `status` property to know if the Cloud is now connected.
   *
   * @returns {Promise} This promise always succeeds, and returns __BEFORE__ the
   *  entire process is complete, per WARNING above.
   */
  async connect() {
    if (this.connecting) {
      return;
    }

    // set initial values
    this.connecting = true;
    this.connectError = null;
    this.config = null;

    await this.loadConfig();

    if (this.config) {
      const state = this.cloudUrl;

      try {
        ssoUtil.startAuthorization({ cloud: this, state });
      } catch (err) {
        this.connectError = err;
        this.connecting = false;
        logger.error(
          'Cloud.connect() => ssoUtil.startAuthorization',
          `Failed to start SSO authorization, error="${err.message}", cloud=${this}`
        );
        return;
      }

      const handler = async function (event) {
        DEV_ENV && rtv.verify({ event }, { event: extEventOauthCodeTs });
        const { data: oAuth } = event;
        removeExtEventHandler(EXT_EVENT_OAUTH_CODE, handler, state);

        try {
          await ssoUtil.finishAuthorization({
            oAuth,
            cloud: this,
          });
        } catch (err) {
          logger.error(
            'Cloud.connect => ssoUtil.finishAuthorization',
            `Failed to finish SSO authorization, error="${err.message}", cloud=${this}`
          );
          this.connectError = err;
          this.resetTokens();
        }

        this.connecting = false;
      }.bind(this);

      addExtEventHandler(EXT_EVENT_OAUTH_CODE, handler, state);
    } else {
      this.connecting = false;
    }
  }

  /**
   * Disconnects from the MCC server, killing the current session, if any.
   * @param {boolean} [destroying] If true, various connection-related properties
   *  are __not__ reset so as not to trigger any unnecessary change events because
   *  the Cloud is being destroyed, not just disconnected.
   */
  disconnect(destroying = false) {
    // NOTE: if we're on the RENDERER side, we may appear connected but we won't
    //  have a config, which we need in order to logout; let the Cloud instance
    //  on MAIN do it
    if (this.connected && this.config) {
      apiUtil.cloudLogout(this); // try but don't block on waiting for response
    }

    if (!destroying) {
      this.config = null;
      this.connectError = null;
      this.connecting = false;
      this.fetching = false;
      this.loaded = false;
      this.resetTokens();
    }
  }

  /** Called when this instance is being deleted/destroyed. */
  destroy() {
    this.disconnect(true);
  }
}
