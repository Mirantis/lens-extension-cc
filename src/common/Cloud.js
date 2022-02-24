import * as rtv from 'rtvjs';
import { isEqual } from 'lodash';
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
import { EventDispatcher } from './EventDispatcher';

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

/**
 * Loads the config object from the Mgmt Cluster at the given URL.
 * @param {string} url
 * @returns {Promise<Object>} The Mgmt cluster's config object as JSON if successful;
 *  rejects with an `Error` if not.
 */
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
export class Cloud extends EventDispatcher {
  /** @static {Object} RTV Typeset (shape) for an API tokens payload. */
  static tokensTs = {
    id_token: [rtv.REQUIRED, rtv.STRING],
    expires_in: [rtv.REQUIRED, rtv.SAFE_INT], // SECONDS valid from now
    refresh_token: [rtv.REQUIRED, rtv.STRING],
    refresh_expires_in: [rtv.REQUIRED, rtv.SAFE_INT], // SECONDS valid from now

    // NOTE: These properties are important because `expires_in` and `refresh_expires_in`
    //  are just offsets from when the tokens were obtained, and on disk, that tells us
    //  nothing; we need the actual expiry date/time so that if Lens is quit and opened
    //  at a later time, we can know if the tokens are still valid. They are marked OPTIONAL
    //  because they don't come from the server, only from JSON
    tokenExpiresAt: [rtv.OPTIONAL, rtv.SAFE_INT],
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
        // each API property becomes expected, which means it can be `null`, which
        //  supports restoring from disk in CloudStore and creating new Cloud instances
        //  prior to having tokens
        ts[key][0] = rtv.EXPECTED;
      }

      return ts;
    }, {}),

    username: [rtv.EXPECTED, rtv.STRING],

    // URL to the MCC instance
    cloudUrl: [rtv.EXPECTED, rtv.STRING],

    syncedNamespaces: [rtv.EXPECTED, rtv.ARRAY, { $: rtv.STRING }],
    ignoredNamespaces: [rtv.EXPECTED, rtv.ARRAY, { $: rtv.STRING }],
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
    super();

    DEV_ENV && rtv.verify({ spec }, { spec: [rtv.OPTIONAL, Cloud.specTs] });

    let _name = null;
    let _syncAll = false;
    let _syncedNamespaces = [];
    let _ignoredNamespaces = [];
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
        DEV_ENV &&
          rtv.verify({ token: newValue }, { token: Cloud.specTs.name });
        if (_name !== newValue) {
          _name = newValue;
          this.dispatchEvent(CLOUD_EVENTS.PROP_CHANGE, this);
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
          rtv.verify({ token: newValue }, { token: Cloud.specTs.syncAll });
        if (_syncAll !== newValue) {
          _syncAll = newValue;
          this.dispatchEvent(CLOUD_EVENTS.SYNC_CHANGE, this);
        }
      },
    });

    /**
     * @member {Array<string>} syncedNamespaces A list of namespace names in the mgmt
     *  cluster that should be synced.
     */
    Object.defineProperty(this, 'syncedNamespaces', {
      enumerable: true,
      get() {
        return _syncedNamespaces;
      },
    });

    /**
     * @member {Array<string>} ignoredNamespaces A list of namespace names in the mgmt
     *  cluster that not synced.
     */
    Object.defineProperty(this, 'ignoredNamespaces', {
      enumerable: true,
      get() {
        return _ignoredNamespaces;
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
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, this);
        }
      },
    });

    /** @member {string} connectError */
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
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, this);
        }
      },
    });

    /** @member {Object} config Mgmt cluster config object. */
    Object.defineProperty(this, 'config', {
      enumerable: true,
      get() {
        return _config;
      },
      set(newValue) {
        if (newValue !== _config) {
          _config = newValue || null;
          this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, this); // affects status
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
          this.dispatchEvent(CLOUD_EVENTS.PROP_CHANGE, this);
        }
      },
    });

    Object.defineProperty(Object.getPrototypeOf(this), 'updateNamespaces', {
      enumerable: true,
      /**
       * @param {Array<string>} syncedList A list of namespace names in the mgmt cluster that should be synced.
       * @param {Array<string>} ignoredList A list of namespace names in the mgmt cluster that not synced.
       * @param {boolean} [silent] if true we don't dispatch event (thus ExtendedCloud does not fetch its data)
       */
      value: function (syncedList, ignoredList, silent = false) {
        DEV_ENV &&
          rtv.verify(
            { syncedList, ignoredList },
            {
              syncedList: Cloud.specTs.syncedNamespaces,
              ignoredList: Cloud.specTs.ignoredNamespaces,
              silent: [rtv.OPTIONAL, rtv.BOOLEAN],
            }
          );
        const isNewSynced = !isEqual(_syncedNamespaces, syncedList);
        const isNewIgnored = !isEqual(_ignoredNamespaces, ignoredList);
        if (isNewSynced) {
          _syncedNamespaces = syncedList;
        }
        if (isNewIgnored) {
          _ignoredNamespaces = ignoredList;
        }
        if (!silent && (isNewSynced || isNewIgnored)) {
          this.dispatchEvent(CLOUD_EVENTS.SYNC_CHANGE, this);
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

  /** @member {string} status One of the `CONNECTION_STATUSES` enum values. */
  get status() {
    if (this.connecting) {
      return CONNECTION_STATUSES.CONNECTING;
    }

    // we're not truly connected to the Cloud unless there's no error, we have
    //  a config (can't make API calls without it), we have an API token, and'
    //  we have the ability to refresh it when it expires
    if (!this.connectError && this.token && this.refreshTokenValid) {
      // if all we're missing is the config, claim we're "connecting" because we
      //  most likely just restored this Cloud from disk after opening Lens, and
      //  we just haven't attempted to fetch the config yet as part of a data fetch
      if (!this.config) {
        return CONNECTION_STATUSES.CONNECTING;
      }

      return CONNECTION_STATUSES.CONNECTED;
    }

    return CONNECTION_STATUSES.DISCONNECTED;
  }

  /**
   * @member {Array<string>} returns syncedNamespaces + ignoredNamespaces array
   */
  get allNamespaces() {
    return this.syncedNamespaces.concat(this.ignoredNamespaces);
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
      this.username = spec.username;
      this.updateNamespaces(spec.syncedNamespaces, spec.ignoredNamespaces);

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
      syncedNamespaces: this.syncedNamespaces.concat(),
      ignoredNamespaces: this.ignoredNamespaces.concat(),
      username: this.username,

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
    };
  }

  /** @returns {string} String representation of this Cloud for logging/debugging. */
  toString() {
    const validTillStr = logDate(this.tokenValidTill);
    return `{Cloud url: "${this.cloudUrl}", token: ${
      this.token
        ? `"${this.token.slice(0, 15)}..${this.token.slice(-15)}"`
        : this.token
    }, valid: ${this.tokenValid}, validTill: ${
      validTillStr ? `"${validTillStr}"` : validTillStr
    }, refreshValid: ${this.refreshTokenValid}, status: "${
      this.status
    }", connectError: ${
      this.connectError ? `"${this.connectError}"` : this.connectError
    }}`;
  }

  /**
   * Loads the Cloud's config object. On failure, the promise still succeeds, but
   *  the `connectError` property is updated with an error message.
   * @returns {Promise} This promise always succeeds.
   */
  async loadConfig() {
    try {
      this.config = await _loadConfig(this.cloudUrl);
      this.connectError = null;
    } catch (err) {
      this.connectError = err;
      logger.error(
        'Cloud.loadConfig()',
        `Failed to get config, error="${err?.message || err}", cloud=${this}`
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
        ssoUtil.startAuthorization({ config: this.config, state });
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
            config: this.config,
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

  disconnect() {
    if (this.connecting) {
      throw new Error('Cannot disconnect while trying to connect');
    }

    this.config = null;
    this.connectError = null;
    this.connecting = false;
    this.resetTokens();
  }
}
