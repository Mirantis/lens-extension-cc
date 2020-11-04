import rtv from 'rtvjs';

// DEBUG TODO so LocalStorage works in Electron -- do we need to encrypt it?
// DEBUG TODO do we need to provide a way for the user to kill their session (i.e. logout) for security reasons?

/**
 * Determines if a date has passed.
 * @param {Date} date
 * @returns {boolean} true if the date has passed; false otherwise.
 */
const hasPassed = function (date) {
  return date.getTime() - Date.now() < 0;
};

/**
 * Captures API authorization tokens and expiries.
 * @class AuthState
 */
export class AuthState {
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
   * @static {Object} RTV Typeset (shape) for a new AuthState instance. All members
   *  are expected, which means properties must exist but may have `null` values.
   */
  static specTs = {
    ...Object.keys(AuthState.tokensTs).reduce((ts, key) => {
      ts[key] = AuthState.tokensTs[key].concat(); // shallow clone of property typeset

      if (key !== 'expiresAt' && key !== 'refreshExpiresAt') {
        // each API property becomes expected, which means it can be `null`, which supports
        //  cloning from an empty state in ExtStateProvider
        ts[key][0] = rtv.EXPECTED;
      }

      return ts;
    }, {}),

    username: [rtv.EXPECTED, rtv.STRING],
  };

  /**
   * @constructor
   * @param {Object|null|undefined} [spec] API token response. See `specTs` for expected shape.
   *  If falsy, a new instance is created, but its state is invalid until `updateTokens()`
   *  is called to set token properties, and `username` is updated to a valid string.
   */
  constructor(spec) {
    rtv.verify({ spec }, { spec: [rtv.OPTIONAL, AuthState.specTs] });

    let _changed = false; // true if any property has changed since the last time the flag was reset
    let _token = null;
    let _expiresIn = null;
    let _tokenValidTill = null;
    let _refreshToken = null;
    let _refreshExpiresIn = null;
    let _refreshTokenValidTill = null;
    let _username = null;

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

    /** @member {string} token */
    Object.defineProperty(this, 'token', {
      enumerable: true,
      get() {
        return _token;
      },
      set(newValue) {
        _changed = _changed || _token !== newValue;
        _token = newValue;
      },
    });

    /** @member {number} expiresIn */
    Object.defineProperty(this, 'expiresIn', {
      enumerable: true,
      get() {
        return _expiresIn;
      },
      set(newValue) {
        _changed = _changed || _expiresIn !== newValue;
        _expiresIn = newValue;
      },
    });

    /** @member {Date} tokenValidTill */
    Object.defineProperty(this, 'tokenValidTill', {
      enumerable: true,
      get() {
        return _tokenValidTill;
      },
      set(newValue) {
        _changed = _changed || _tokenValidTill !== newValue;
        _tokenValidTill = newValue;
      },
    });

    /** @member {string} refreshToken */
    Object.defineProperty(this, 'refreshToken', {
      enumerable: true,
      get() {
        return _refreshToken;
      },
      set(newValue) {
        _changed = _changed || _refreshToken !== newValue;
        _refreshToken = newValue;
      },
    });

    /** @member {number} refreshExpiresIn */
    Object.defineProperty(this, 'refreshExpiresIn', {
      enumerable: true,
      get() {
        return _refreshExpiresIn;
      },
      set(newValue) {
        _changed = _changed || _refreshExpiresIn !== newValue;
        _refreshExpiresIn = newValue;
      },
    });

    /** @member {Date} refreshTokenValidTill */
    Object.defineProperty(this, 'refreshTokenValidTill', {
      enumerable: true,
      get() {
        return _refreshTokenValidTill;
      },
      set(newValue) {
        _changed = _changed || _refreshTokenValidTill !== newValue;
        _refreshTokenValidTill = newValue;
      },
    });

    /** @member {sting} username */
    Object.defineProperty(this, 'username', {
      enumerable: true,
      get() {
        return _username;
      },
      set(newValue) {
        _changed = _changed || _username !== newValue;
        _username = newValue;
      },
    });

    //// initialize

    // set all token-related members if they're specified
    if (spec && spec.id_token && spec.refresh_token) {
      this.updateTokens(spec);
    }

    this.username = spec ? spec.username : null;

    _changed = false; // make sure unchanged after initialization
  }

  /**
   * @returns {boolean} True if tokens are valid; false if they have expired with
   *  no way to renew them automatically.
   */
  isValid() {
    // as long as we have a token and a way to refresh it if it's expired, we're good
    return this.token && !this.isRefreshTokenExpired();
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
  clearTokens() {
    Object.keys(this).forEach((key) => {
      if (key !== 'username') {
        this[key] = null;
      }
    });
  }

  /**
   * Update tokens and expiries from API response.
   * @param {Object} tokens API token payload. See `tokensTs` for expected shape.
   */
  updateTokens(tokens) {
    rtv.verify({ tokens }, { tokens: AuthState.tokensTs });

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
   *  by `JSON.stringify(authState)`.
   * @returns {Object} This object can subsequently be used as a `spec` object
   *  to create a new `AuthState` instance.
   */
  toJSON() {
    // DEBUG there's a problem here, in that we need to store the 'expires AT'
    //  milliseconds so that when we reload this from storage, we can tell
    //  if the tokens have expired since being stored
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
      username: this.username,
    };
  }
}
