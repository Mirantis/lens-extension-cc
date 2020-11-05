import rtv from 'rtvjs';

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

      if (ts[key][0] === rtv.REQUIRED) {
        // each API property becomes optional, which means it can be `null`, which
        //  supports cloning from an empty state in ExtStateProvider
        ts[key][0] = rtv.EXPECTED;
      }

      return ts;
    }, {}),

    username: [rtv.EXPECTED, rtv.STRING],
    password: [rtv.EXPECTED, rtv.STRING],
    idpClientId: [rtv.OPTIONAL, rtv.STRING],
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
    let _password = null;
    let _idpClientId = undefined;

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

    /** @member {string|null} token */
    Object.defineProperty(this, 'token', {
      enumerable: true,
      get() {
        return _token;
      },
      set(newValue) {
        rtv.verify({ token: newValue }, { token: AuthState.specTs.id_token });
        _changed = _changed || _token !== newValue;
        _token = newValue || null; // normalize empty to null
      },
    });

    /** @member {number|null} expiresIn */
    Object.defineProperty(this, 'expiresIn', {
      enumerable: true,
      get() {
        return _expiresIn;
      },
      set(newValue) {
        rtv.verify(
          { expiresIn: newValue },
          { expiresIn: AuthState.specTs.expires_in }
        );
        _changed = _changed || _expiresIn !== newValue;
        _expiresIn = newValue;
      },
    });

    /** @member {Date|null} tokenValidTill */
    Object.defineProperty(this, 'tokenValidTill', {
      enumerable: true,
      get() {
        return _tokenValidTill;
      },
      set(newValue) {
        rtv.verify(
          { tokenValidTill: newValue },
          { tokenValidTill: [rtv.EXPECTED, rtv.DATE] }
        );
        _changed = _changed || _tokenValidTill !== newValue;
        _tokenValidTill = newValue;
      },
    });

    /** @member {string|null} refreshToken */
    Object.defineProperty(this, 'refreshToken', {
      enumerable: true,
      get() {
        return _refreshToken;
      },
      set(newValue) {
        rtv.verify(
          { refreshToken: newValue },
          { refreshToken: AuthState.specTs.refresh_token }
        );
        _changed = _changed || _refreshToken !== newValue;
        _refreshToken = newValue || null; // normalize empty to null
      },
    });

    /** @member {number|null} refreshExpiresIn */
    Object.defineProperty(this, 'refreshExpiresIn', {
      enumerable: true,
      get() {
        return _refreshExpiresIn;
      },
      set(newValue) {
        rtv.verify(
          { refreshExpiresIn: newValue },
          { refreshExpiresIn: AuthState.specTs.refresh_expires_in }
        );
        _changed = _changed || _refreshExpiresIn !== newValue;
        _refreshExpiresIn = newValue;
      },
    });

    /** @member {Date|null} refreshTokenValidTill */
    Object.defineProperty(this, 'refreshTokenValidTill', {
      enumerable: true,
      get() {
        return _refreshTokenValidTill;
      },
      set(newValue) {
        rtv.verify(
          { refreshTokenValidTill: newValue },
          { refreshTokenValidTill: [rtv.EXPECTED, rtv.DATE] }
        );
        _changed = _changed || _refreshTokenValidTill !== newValue;
        _refreshTokenValidTill = newValue;
      },
    });

    /** @member {sting|null} username */
    Object.defineProperty(this, 'username', {
      enumerable: true,
      get() {
        return _username;
      },
      set(newValue) {
        rtv.verify(
          { username: newValue },
          { username: AuthState.specTs.username }
        );
        _changed = _changed || _username !== newValue;
        _username = newValue || null; // normalize empty to null
      },
    });

    /** @member {sting|null} password */
    Object.defineProperty(this, 'password', {
      enumerable: true,
      get() {
        return _password;
      },
      set(newValue) {
        rtv.verify(
          { password: newValue },
          { password: AuthState.specTs.password }
        );
        _changed = _changed || _password !== newValue;
        _password = newValue || null; // normalize empty to null
      },
    });

    /**
     * @member {sting|null|undefined} idpClientId Client ID of the IDP associated
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
        rtv.verify(
          { idpClientId: newValue },
          { idpClientId: AuthState.specTs.idpClientId }
        );
        _changed = _changed || _idpClientId !== newValue;
        _idpClientId = newValue;
      },
    });

    //// initialize

    // set all token-related members if they're specified
    if (spec && spec.id_token && spec.refresh_token) {
      this.updateTokens(spec);
    }

    this.username = spec ? spec.username : null;
    this.password = spec ? spec.password : null;
    this.idpClientId = spec ? spec.idpClientId || null : undefined;

    _changed = false; // make sure unchanged after initialization
  }

  /** @returns {boolean} True if the username and password are defined. */
  hasCredentials() {
    return !!(this.username && this.password);
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
  clearTokens() {
    this.token = null;
    this.expiresIn = null;
    this.expiresAt = null;
    this.tokenValidTill = null;

    this.refreshToken = null;
    this.refreshExpiresIn = null;
    this.refreshExpiresAt = null;
    this.refreshTokenValidTill = null;
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
      password: this.password,
      idpClientId: this.idpClientId,
    };
  }
}
