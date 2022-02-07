import * as rtv from 'rtvjs';
import { request } from '../util/netUtil';
import { logger } from '../util/logger';
import * as strings from '../strings';
import * as ssoUtil from '../util/ssoUtil';
import {
  EXT_EVENT_OAUTH_CODE,
  extEventOauthCodeTs,
  addExtEventHandler,
  removeExtEventHandler,
} from '../renderer/eventBus';

/**
 * Number of __milliseconds__ to remove from the future token expiry time obtained
 *  from the server, considering there's a network delay from the timestamp on the
 *  server to when we receive it client-side.
 * @type {number}
 */
const EXPIRY_ADJUST = -500;

/**
 * Determines if a date has passed.
 * @param {Date} date
 * @returns {boolean} true if the date has passed; false otherwise.
 */
const hasPassed = function (date) {
  return date.getTime() - Date.now() < 0;
};

/**
 * Formats a date for debugging/logging purposes.
 * @param {Date} date
 * @returns {string} Formatted date, or 'undefined' or 'null' if it's not defined.
 */
const logDate = function (date) {
  if (date) {
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

  return `${date}`;
};

export const CONNECTION_STATUSES = Object.freeze({
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
});

// Events dispatched by Cloud instances.
export const CLOUD_EVENTS = Object.freeze({
  /**
   * At least one of the Cloud's status-related properties has changed.
   *
   * Expected signature: `(cloud: Cloud) => void`
   */
  STATUS_CHANGE: 'statusChange',

  /**
   * At least one of the Cloud's token-related properties has changed, likely because
   *  the token expired and had to be refreshed, or because the Cloud had no tokens,
   *  connected to MCC, and obtained a new set.
   *
   * Expected signature: `(cloud: Cloud) => void`
   */
  TOKEN_CHANGE: 'tokenChange',

  /**
   * At least one of the Cloud's sync-related properties has changed.
   *
   * Expected signature: `(cloud: Cloud) => void`
   */
  SYNC_CHANGE: 'syncChange',

  /**
   * At least one of the Cloud's other properties has changed (not related to
   *  status, tokens, or sync). For example, its user-specified name.
   *
   * Expected signature: `(cloud: Cloud) => void`
   */
  PROP_CHANGE: 'propChange',
});

const _loadConfig = async (url) => {
  const res = await request(
    `${url}/config.js`,
    {},
    { extractBodyMethod: 'text' }
  );
  if (res.error) {
    throw new Error(res.error);
  } else {
    const content = res.body
      .replace(/^window\.CONFIG\s*=\s*{/, '{')
      .replace('};', '}');

    try {
      return JSON.parse(content);
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
export class Cloud {
  /** @static {Object} RTV Typeset (shape) for an API tokens payload. */
  static tokensTs = {
    id_token: [rtv.REQUIRED, rtv.STRING],
    expires_in: [rtv.REQUIRED, rtv.SAFE_INT], // SECONDS valid from now
    refresh_token: [rtv.REQUIRED, rtv.STRING],
    refresh_expires_in: [rtv.REQUIRED, rtv.SAFE_INT], // SECONDS valid from now
  };

  /**
   * @static {Object} RTV Typeset (shape) for a new Cloud instance. All members
   *  are expected, which means properties must exist but may have `null` values.
   */
  static specTs = {
    ...Object.keys(Cloud.tokensTs).reduce((ts, key) => {
      ts[key] = Cloud.tokensTs[key].concat(); // shallow clone of property typeset

      if (ts[key][0] === rtv.REQUIRED) {
        // each API property becomes optional, which means it can be `null`, which
        //  supports cloning from an empty state in CloudStore
        ts[key][0] = rtv.EXPECTED;
      }

      return ts;
    }, {}),

    username: [rtv.EXPECTED, rtv.STRING],

    // URL to the MCC instance
    cloudUrl: [rtv.EXPECTED, rtv.STRING],

    syncNamespaces: [rtv.EXPECTED, rtv.ARRAY, { $: rtv.STRING }],
    name: [rtv.EXPECTED, rtv.STRING],
    syncAll: [rtv.EXPECTED, rtv.BOOLEAN],
  };

  /**
   * @constructor
   * @param {Object|null|undefined} [spec] A serialized (from `toJSON()`) Cloud. See `specTs`
   *  for expected shape. If falsy, a new instance is created, but all properties are `null`
   *  or `undefined` and need to be set.
   */
  constructor(spec) {
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
                '------- Cloud._scheduleDispatch(): DISPATCHING event=%s',
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
        console.log('------- Cloud._scheduleDispatch(): already scheduled'); // DEBUG LOG
      }
    };

    Object.defineProperties(this, {
      /**
       * Adds an event listener to this Cloud instance.
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
       * Removes an event listener from this Cloud instance.
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
       * Dispatches an event to all listenders on this Cloud instance. If the
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

    let _name = null;
    let _syncAll = false;
    let _syncNamespaces = [];
    let _token = null;
    let _expiresIn = null;
    let _tokenValidTill = null;
    let _refreshToken = null;
    let _refreshExpiresIn = null;
    let _refreshTokenValidTill = null;
    let _username = null;
    let _cloudUrl = null;
    let _config = null;
    let _connectError = null;
    let _connecting = false;

    /** name is the "friendly name" given to the mgmt cluster by
     * the user when they will add new mgmt clusters to the extension
     */
    Object.defineProperty(this, 'name', {
      enumerable: true,
      get() {
        return _name;
      },
      set(newValue) {
        DEV_ENV &&
          rtv.verify({ token: newValue }, { token: Cloud.specTs.name });
        if (_name !== newValue) {
          _name = newValue;
          console.log('------- Cloud.[set]name: PROP_CHANGE'); // DEBUG LOG
          this.dispatchEvent(CLOUD_EVENTS.PROP_CHANGE, this);
        }
      },
    });

    /** is true if the user chooses to sync all namespaces in a mgmt cluster,
     * or false if they pick individual namespaces.
     */
    Object.defineProperty(this, 'syncAll', {
      enumerable: true,
      get() {
        return _syncAll;
      },
      set(newValue) {
        DEV_ENV &&
          rtv.verify({ token: newValue }, { token: Cloud.specTs.syncAll });
        if (_syncAll !== newValue) {
          _syncAll = newValue;
          console.log('------- Cloud.[set]syncAll: SYNC_CHANGE'); // DEBUG LOG
          this.dispatchEvent(CLOUD_EVENTS.SYNC_CHANGE, this);
        }
      },
    });

    /** is a list of namespace names in the mgmt cluster that should be synced.
     *  If syncAll is true, this list is ignored and all existing/future namespaces are synced.
     */
    Object.defineProperty(this, 'syncNamespaces', {
      enumerable: true,
      get() {
        return _syncNamespaces;
      },
      set(newValue) {
        DEV_ENV &&
          rtv.verify(
            { token: newValue },
            { token: Cloud.specTs.syncNamespaces }
          );
        if (_syncNamespaces !== newValue) {
          _syncNamespaces = newValue;
          console.log('------- Cloud.[set]syncNamespaces: SYNC_CHANGE'); // DEBUG LOG
          this.dispatchEvent(CLOUD_EVENTS.SYNC_CHANGE, this);
        }
      },
    });

    Object.defineProperty(this, 'status', {
      enumerable: false, // not persisted in JSON
      get() {
        if (this.connecting) {
          return CONNECTION_STATUSES.CONNECTING;
        }
        if (this.isConnected()) {
          return CONNECTION_STATUSES.CONNECTED;
        }
        return CONNECTION_STATUSES.DISCONNECTED;
      },
    });

    Object.defineProperty(this, 'connecting', {
      enumerable: false, // not persisted in JSON
      get() {
        return _connecting;
      },
      set(newValue) {
        if (_connecting !== !!newValue) {
          _connecting = !!newValue;
          console.log('------- Cloud.[set]connecting: STATUS_CHANGE'); // DEBUG LOG
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, this);
        }
      },
    });

    /** @member {string} connectError */
    Object.defineProperty(this, 'connectError', {
      enumerable: false, // NOTE: we make this non-enumerable so it doesn't get persisted to JSON
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
          console.log('------- Cloud.[set]connectError: STATUS_CHANGE'); // DEBUG LOG
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, this);
        }
      },
    });

    /** @member {Object} config */
    Object.defineProperty(this, 'config', {
      enumerable: false, // NOTE: we make this non-enumerable so it doesn't get persisted to JSON
      get() {
        return _config;
      },
      set(newValue) {
        if (newValue !== _config) {
          _config = newValue || null;
          // NOTE: the config is only used internally, so we don't notify listeners
          //  when it changes
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
          console.log(
            '------- Cloud.[set]token: TOKEN_CHANGE, STATUS_CHANGE, newValue=%s',
            `${newValue.slice(0, 15)}~${newValue.slice(-15)}`
          ); // DEBUG LOG
          this.dispatchEvent(CLOUD_EVENTS.TOKEN_CHANGE, this);
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, this); // tokens affect status
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
          console.log(
            '------- Cloud.[set]expiresIn: TOKEN_CHANGE, STATUS_CHANGE'
          ); // DEBUG LOG
          this.dispatchEvent(CLOUD_EVENTS.TOKEN_CHANGE, this);
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, this); // tokens affect status
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
          console.log(
            '------- Cloud.[set]tokenValidTill: TOKEN_CHANGE, STATUS_CHANGE'
          ); // DEBUG LOG
          this.dispatchEvent(CLOUD_EVENTS.TOKEN_CHANGE, this);
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, this); // tokens affect status
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
          console.log(
            '------- Cloud.[set]refreshToken: TOKEN_CHANGE, STATUS_CHANGE'
          ); // DEBUG LOG
          this.dispatchEvent(CLOUD_EVENTS.TOKEN_CHANGE, this);
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, this); // tokens affect status
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
          console.log(
            '------- Cloud.[set]refreshExpiresIn: TOKEN_CHANGE, STATUS_CHANGE'
          ); // DEBUG LOG
          this.dispatchEvent(CLOUD_EVENTS.TOKEN_CHANGE, this);
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, this); // tokens affect status
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
          console.log(
            '------- Cloud.[set]refreshTokenValidTill: TOKEN_CHANGE, STATUS_CHANGE'
          ); // DEBUG LOG
          this.dispatchEvent(CLOUD_EVENTS.TOKEN_CHANGE, this);
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, this); // tokens affect status
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
          console.log('------- Cloud.[set]username: TOKEN_CHANGE'); // DEBUG LOG
          this.dispatchEvent(CLOUD_EVENTS.TOKEN_CHANGE, this); // related to tokens but not status
        }
      },
    });

    /**
     * @member {string|null} cloudUrl
     */
    Object.defineProperty(this, 'cloudUrl', {
      enumerable: true,
      get() {
        return _cloudUrl;
      },
      set(newValue) {
        const normalizedNewValue = newValue || null; // '' or undefined -> null
        DEV_ENV &&
          rtv.verify(
            { cloudUrl: normalizedNewValue },
            { cloudUrl: Cloud.specTs.cloudUrl }
          );
        if (_cloudUrl !== normalizedNewValue) {
          if (_cloudUrl) {
            // the URL has changed after being set: any tokens we have are invalid
            this.resetTokens();
          }

          _cloudUrl = normalizedNewValue;
          console.log('------- Cloud.[set]cloudUrl: PROP_CHANGE'); // DEBUG LOG
          this.dispatchEvent(CLOUD_EVENTS.PROP_CHANGE, this);
        }
      },
    });

    //// initialize

    this.update(spec);

    // since we assign properties when initializing, and this may cause some events
    //  to get dispatched, make sure we start with a clean slate for any listeners
    //  that get added to this new instance we just constructed
    this.emptyEventQueue();
  }

  /**
   * @returns {boolean} True if there are credentials, a token, and a valid way
   *  to refresh it if it expires; false otherwise.
   */
  isConnected() {
    return !!this.token && !this.isRefreshTokenExpired();
  }

  /** @returns {boolean} True if the `token` has expired; false otherwise. */
  isTokenExpired() {
    return !!this.tokenValidTill && hasPassed(this.tokenValidTill);
  }

  /** @returns {boolean} True if the `refreshToken` has expired; false otherwise. */
  isRefreshTokenExpired() {
    return (
      !!this.refreshTokenValidTill && hasPassed(this.refreshTokenValidTill)
    );
  }

  /**
   * Clears all properties that are token-related. Use this if all tokens have expired,
   *  for example.
   */
  resetTokens() {
    console.log('------- Cloud.resetTokens()'); // DEBUG LOG

    this.token = null;
    this.expiresIn = null;
    this.tokenValidTill = null;

    this.refreshToken = null;
    this.refreshExpiresIn = null;
    this.refreshTokenValidTill = null;

    // tokens are tied to the user, so clear that too
    this.username = null;
  }

  /** Clears all data. */
  reset() {
    this.resetTokens();
  }

  /**
   * Update only tokens and expiries from an API response.
   * @param {Object} tokens API token payload. See `tokensTs` for expected shape.
   */
  updateTokens(tokens) {
    DEV_ENV && rtv.verify({ tokens }, { tokens: Cloud.tokensTs });

    console.log(
      '------- Cloud.updateTokens(), token=%s, tokens=',
      `${tokens.id_token.slice(0, 15)}~${tokens.id_token.slice(-15)}`,
      tokens
    ); // DEBUG LOG

    const now = Date.now();

    this.token = tokens.id_token;
    this.expiresIn = tokens.expires_in; // SECONDS
    this.tokenValidTill = new Date(now + this.expiresIn * 1000 + EXPIRY_ADJUST);

    this.refreshToken = tokens.refresh_token;
    this.refreshExpiresIn = tokens.refresh_expires_in; // SECONDS
    this.refreshTokenValidTill = new Date(
      now + this.refreshExpiresIn * 1000 + EXPIRY_ADJUST
    );
  }

  /**
   * Updates this Cloud given a JSON model produced by `toJSON()` at some earlier
   *  point in time. This is basically like calling the constructor, just that it
   *  updates this instance's properties (if changes have occurred) rather than
   *  creating a new instance.
   * @param {Object|null|undefined} spec JSON object.
   * @returns {Cloud} This instance, for chaining/convenience.
   */
  update(spec) {
    DEV_ENV && rtv.verify({ spec }, { spec: [rtv.OPTIONAL, Cloud.specTs] });

    if (spec) {
      this.cloudUrl = spec.cloudUrl;
      this.name = spec.name;
      this.syncAll = spec.syncAll;
      this.syncNamespaces = spec.syncNamespaces;
      this.username = spec.username;

      if (spec.id_token && spec.refresh_token) {
        this.updateTokens(spec);
      }
    }

    return this;
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
      syncAll: this.syncAll,
      syncNamespaces: this.syncNamespaces.concat(),
      username: this.username,

      // NOTE: these property names contain underscores so they match the names
      //  we get in `updateTokens()`, which come from the MCC API
      id_token: this.token,
      expires_in: this.expiresIn,
      refresh_token: this.refreshToken,
      refresh_expires_in: this.refreshExpiresIn,

      // NOTE: we just write this to JSON for easier debugging when looking at the
      //  data written on disk by the CloudStore; we don't actually use these
      //  properties anywhere (it's just easier to see a timestamp in local time
      //  than to just see the expiry in minutes without a point of reference)
      tokenExpiresAt: this.tokenValidTill?.toString() || null,
      refreshExpiresAt: this.refreshTokenValidTill?.toString() || null,
    };
  }

  /** @returns {string} String representation of this Cloud for logging/debugging. */
  toString() {
    const validTillStr = logDate(this.tokenValidTill);
    return `{Cloud url: "${this.cloudUrl}", token: ${
      this.token
        ? `${this.token.slice(0, 15)}..${this.token.slice(-15)}`
        : this.token
    }, validTill: ${
      validTillStr ? `"${validTillStr}"` : validTillStr
    }, expired: ${this.isTokenExpired()}, refreshExpired: ${this.isRefreshTokenExpired()}, connected: ${this.isConnected()}, connectError: ${
      this.connectError ? `"${this.connectError}"` : this.connectError
    }}`;
  }

  async loadConfig() {
    try {
      this.config = await _loadConfig(this.cloudUrl);
    } catch (error) {
      this.connectError = error;
    }
  }

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
        ssoUtil.startAuthorization({ config: this.config, state });
      } catch (err) {
        logger.error(
          'Cloud.connect()',
          `Failed to start SSO authorization, error="${err.message}"`
        );
        this.connectError = err;
        this.connecting = false;
        return;
      }

      const handler = async function (event) {
        DEV_ENV && rtv.verify({ event }, { event: extEventOauthCodeTs });
        const { data: oAuth } = event;
        removeExtEventHandler(EXT_EVENT_OAUTH_CODE, handler, state);

        try {
          await ssoUtil.finishAuthorization({
            oAuth,
            config: this.config,
            cloud: this,
          });
        } catch (err) {
          logger.error(
            'Cloud.connect => ssoUtil.finishAuthorization',
            `Failed to finish SSO authorization, error="${err.message}"`
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

  disconnect() {
    this.config = null;
    this.connectError = null;
    this.resetTokens();
  }
}
