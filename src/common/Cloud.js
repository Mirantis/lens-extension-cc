import * as rtv from 'rtvjs';
import { request } from '../util/netUtil';
import { logger } from '../util/logger';
import * as strings from '../strings';
import * as ssoUtil from '../util/ssoUtil';
import {
  extEventOauthCodeTs,
  addExtEventHandler,
  removeExtEventHandler,
} from '../renderer/eventBus';
import { EXT_EVENT_OAUTH_CODE } from '../constants';

/**
 * Determines if a date has passed.
 * @param {Date} date
 * @returns {boolean} true if the date has passed; false otherwise.
 */
const hasPassed = function (date) {
  return date.getTime() - Date.now() < 0;
};

export const CONNECTION_STATUSES = Object.freeze({
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
});

// Events dispatched by Cloud instances.
export const CLOUD_EVENTS = Object.freeze({
  /**
   * The Cloud object's connection status has changed.
   * @param {Cloud} cloud The Cloud object.
   */
  STATUS_CHANGE: 'statusChange',
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
        throw new Error(strings.configProvider.error.unexpectedToken());
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

    // NOTE: this is not an API-provided property
    // SECONDS in epoch when token expires
    // if this is included (typically when restoring from storage), it overrides expires_in
    expiresAt: [rtv.OPTIONAL, rtv.SAFE_INT],

    // NOTE: this is not an API-provided property
    // SECONDS in epoch when refresh token expires
    // if this is included (typically when restoring from storage), it overrides refresh_expires_in
    refreshExpiresAt: [rtv.OPTIONAL, rtv.SAFE_INT],
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
        //  supports cloning from an empty state in ExtStateProvider
        ts[key][0] = rtv.EXPECTED;
      }

      return ts;
    }, {}),

    username: [rtv.EXPECTED, rtv.STRING],

    // IDP client associated with current tokens; undefined if unknown; null if not specified
    idpClientId: [rtv.OPTIONAL, rtv.STRING],

    // URL to the MCC instance
    cloudUrl: [rtv.EXPECTED, rtv.STRING],

    syncNamespaces: [rtv.EXPECTED, rtv.ARRAY],
    name: [rtv.EXPECTED, rtv.STRING],
    syncAll: [rtv.EXPECTED, rtv.BOOLEAN],
  };

  /**
   * @constructor
   * @param {Object|null|undefined} [spec] API token response. See `specTs` for expected shape.
   *  If falsy, a new instance is created, but its state is invalid until `updateTokens()`
   *  is called to set token properties, and `username` is updated to a valid string.
   */
  constructor(spec) {
    DEV_ENV && rtv.verify({ spec }, { spec: [rtv.OPTIONAL, Cloud.specTs] });

    const _eventListeners = {}; // map of event name to array of functions that are handlers
    const _eventQueue = []; // list of `{ name: string, params: Array }` objects to dispatch

    // asynchronously dispatches queued events on the next frame
    const _scheduleDispatch = () => {
      setTimeout(function () {
        if (Object.keys(_eventListeners).length > 0 && _eventQueue.length > 0) {
          const events = _eventQueue.concat(); // shallow clone for local copy

          // remove all events immediately in case more get added while we're
          //  looping through this set
          _eventQueue.length = 0;

          events.forEach((event) => {
            const { name, params } = event;
            const handlers = _eventListeners[name] || [];
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
    };

    Object.defineProperties(this, {
      /**
       * Adds an event listener to this Cloud instance.
       * @method addEventListener
       * @param {string} name Event name.
       * @param {Function} handler Handler.
       */
      addEventListener: {
        enumerable: false,
        value(name, handler) {
          _eventListeners[name] = _eventListeners[name] || [];
          if (!_eventListeners[name].find(handler)) {
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
        enumerable: false,
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
    });

    let _changed = false; // true if any property has changed since the last time the flag was reset
    let _token = null;
    let _name = null;
    let _syncAll = false;
    let _expiresIn = null;
    let _tokenValidTill = null;
    let _refreshToken = null;
    let _refreshExpiresIn = null;
    let _refreshTokenValidTill = null;
    let _username = null;
    let _idpClientId = null;
    let _cloudUrl = null;
    let _config = null;
    let _connectError = null;
    let _connecting = false;

    /** @member {boolean} changed */
    Object.defineProperty(this, 'changed', {
      enumerable: false, // NOTE: we make this non-enumerable so it doesn't get persisted to JSON
      get() {
        return _changed;
      },
      set(newValue) {
        _changed = !!newValue;
      },
    });

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
          _changed = true;
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
          _changed = true;
        }
      },
    });

    /** is a list of namespace names in the mgmt cluster that should be synced.
     *  If syncAll is true, this list is ignored and all existing/future namespaces are synced.
     */
    Object.defineProperty(this, 'syncNamespaces', {
      enumerable: true,
      value: [],
    });

    Object.defineProperty(this, 'status', {
      enumerable: false, // not persisted in JSON
      get() {
        if (this.connecting) {
          return CONNECTION_STATUSES.CONNECTING;
        }
        if (this.isValid()) {
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
          _connecting = newValue;
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
        _connectError = validValue;
      },
    });

    /** @member {Object} config */
    Object.defineProperty(this, 'config', {
      enumerable: false, // NOTE: we make this non-enumerable so it doesn't get persisted to JSON
      get() {
        return _config;
      },
      set(newValue) {
        _config = newValue;
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
          _changed = true;
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, this);
        }
      },
    });

    /** @member {number|null} expiresIn */
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
          _changed = true;
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, this);
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
          _changed = true;
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, this);
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
          _changed = true;
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, this);
        }
      },
    });

    /** @member {number|null} refreshExpiresIn */
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
          _changed = true;
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, this);
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
          _changed = true;
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, this);
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
          _changed = true;
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, this);
        }
      },
    });

    /**
     * @member {string|null} idpClientId Client ID of the IDP associated
     *  with the tokens. `undefined` means not specified; `null` means the tokens
     *  are related to the default IDP, which is Keycloak; otherwise, it's a
     *  string that identifies a custom IDP.
     */
    Object.defineProperty(this, 'idpClientId', {
      enumerable: true,
      get() {
        return _idpClientId;
      },
      set(newValue) {
        const normalizedNewValue = newValue || null; // '' or undefined -> null
        DEV_ENV &&
          rtv.verify(
            { idpClientId: normalizedNewValue },
            { idpClientId: Cloud.specTs.idpClientId }
          );
        if (_idpClientId !== normalizedNewValue) {
          _idpClientId = normalizedNewValue;
          _changed = true;
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, this);
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
          _changed = true;
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, this);
        }
      },
    });

    //// initialize

    // set all token-related members if they're specified
    if (spec && spec.id_token && spec.refresh_token) {
      this.updateTokens(spec);
    }

    this.username = spec ? spec.username : null;
    this.idpClientId = spec ? spec.idpClientId : null;
    this.cloudUrl = spec ? spec.cloudUrl : null;
    this.name = spec ? spec.name : null;
    this.syncAll = spec ? spec.syncAll : false;

    if (spec?.syncNamespaces) {
      spec.syncNamespaces.forEach((ns) => this.syncNamespaces.push(ns));
    }

    _changed = false; // make sure unchanged after initialization
    _eventQueue.length = 0; // remove any events generated from using setters to initialize
  }

  /**
   * @returns {boolean} True if the username is defined and `usesSso=true` (that is,
   *  it's boolean and it's known to be SSO, not just a truthy/falsy value).
   */
  hasCredentials() {
    return !!this.username;
  }

  /**
   * @returns {boolean} True if there are credentials, a token, and a valid way
   *  to refresh it if it expires; false otherwise.
   */
  isValid() {
    return (
      this.hasCredentials() && !!this.token && !this.isRefreshTokenExpired()
    );
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
    this.token = null;
    this.expiresIn = null;
    this.tokenValidTill = null;

    this.refreshToken = null;
    this.refreshExpiresIn = null;
    this.refreshTokenValidTill = null;

    // tokens are tied to the IDP and user, so clear these too
    this.idpClientId = null;
    this.username = null;
  }

  /** Clears all data. */
  reset() {
    this.resetTokens();
  }

  /**
   * Update tokens and expiries from API response.
   * @param {Object} tokens API token payload. See `tokensTs` for expected shape.
   */
  updateTokens(tokens) {
    DEV_ENV && rtv.verify({ tokens }, { tokens: Cloud.tokensTs });

    this.token = tokens.id_token;
    this.expiresIn = tokens.expires_in;
    if (tokens.expiresAt) {
      this.tokenValidTill = new Date(tokens.expiresAt * 1000);
    } else {
      this.tokenValidTill = new Date(Date.now() + this.expiresIn * 1000);
    }

    this.refreshToken = tokens.refresh_token;
    this.refreshExpiresIn = tokens.refresh_expires_in;
    if (tokens.refreshExpiresAt) {
      this.refreshTokenValidTill = new Date(tokens.refreshExpiresAt * 1000);
    } else {
      this.refreshTokenValidTill = new Date(
        Date.now() + this.refreshExpiresIn * 1000
      );
    }
  }

  /**
   * Serializes this instance to a JSON object for storage. Called automatically
   *  by `JSON.stringify(cloud)`.
   * @returns {Object} This object can subsequently be used as a `spec` object
   *  to create a new `Cloud` instance.
   */
  toJSON() {
    return {
      id_token: this.token,
      expires_in: this.expiresIn,
      refresh_token: this.refreshToken,
      refresh_expires_in: this.refreshExpiresIn,

      expiresAt: this.tokenValidTill
        ? Math.floor(this.tokenValidTill.getTime() / 1000)
        : null,
      refreshExpiresAt: this.refreshTokenValidTill
        ? Math.floor(this.refreshTokenValidTill.getTime() / 1000)
        : null,
      idpClientId: this.idpClientId,

      username: this.username,
      cloudUrl: this.cloudUrl,
      name: this.name,
      syncAll: this.syncAll,
      syncNamespaces: this.syncNamespaces.concat(),
    };
  }

  async connect() {
    if (this.connecting) {
      return;
    }
    // set initial values
    this.connecting = true;
    this.connectError = null;
    this.config = null;

    try {
      this.config = await _loadConfig(this.cloudUrl);
    } catch (error) {
      this.connectError = error;
    }

    if (this.config) {
      const state = this.cloudUrl;
      ssoUtil.startAuthorization({ config: this.config, state });

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
            `Failed to finishAuthorization, error="${err.message}"`
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
