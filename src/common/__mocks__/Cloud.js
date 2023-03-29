import { EventDispatcher } from '../EventDispatcher';
import { CloudNamespace } from '../CloudNamespace';

const hasPassed = function (date) {
  return date instanceof Date ? date.getTime() - Date.now() < 0 : false;
};

// duplicate export from real Cloud.js since we're mocking the module
export const CONNECTION_STATUSES = Object.freeze({
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
});

// duplicate export from real Cloud.js since we're mocking the module
export const CLOUD_EVENTS = Object.freeze({
  STATUS_CHANGE: 'statusChange',
  LOADED_CHANGE: 'loadedChange',
  FETCHING_CHANGE: 'fetchingChange',
  TOKEN_CHANGE: 'tokenChange',
  SYNC_CHANGE: 'syncChange',
  PROP_CHANGE: 'propChange',
});

// cloud name, which will run failed scenario in connect() method
export const MOCK_CONNECT_FAILURE_CLOUD_NAME = 'failed-cloud';

export const mkCloudJson = (props) =>
  Object.assign(
    {
      // NOTE: these properties are the ones required by Cloud.specTs in the real Cloud.js
      cloudUrl: 'http://cloud.url',
      name: 'cloud-name',
      offlineAccess: false,
      trustHost: false,
      syncAll: false,
      username: 'fred',
      id_token: null,
      expires_in: null,
      tokenExpiresAt: null,
      _tokenValidTill: null,
      refresh_token: null,
      refresh_expires_in: null,
      refreshExpiresAt: null,
      _refreshValidTill: null,
      namespaces: [],
    },
    props
  );

export const generateOAuthTokens = () => {
  const now = Date.now();
  const fiveMin = 5 * 60; // seconds (5 minutes)
  const thirtyMin = 30 * 60; // seconds (30 minutes)
  return {
    id_token: 'token',
    expires_in: fiveMin,
    tokenExpiresAt: new Date(now + fiveMin * 1000).getTime(),
    refresh_token: 'token',
    refresh_expires_in: fiveMin,
    refreshExpiresAt: new Date(now + thirtyMin * 1000).getTime(),
  };
};

export class Cloud extends EventDispatcher {
  constructor(urlOrSpec, ipcMain) {
    super();

    if (!urlOrSpec) {
      throw new Error(
        'FAKE CLOUD still requires a URL or a spec when being created'
      );
    }

    const json = mkCloudJson();

    // create most of the instance by assigning onto it properties from the spec
    //  given to the constructor, relying on a default cloud JSON if a URL was
    //  given instead of the spec
    Object.assign(
      this,

      // defaults
      {
        cloudUrl: json.cloudUrl,
        name: json.name,
        offlineAccess: json.offlineAccess,
        trustHost: json.trustHost,
        syncAll: json.syncAll,
        username: json.username,
        token: json.id_token,
        expiresIn: json.expires_in,
        tokenValidTill: new Date(json.tokenExpiresAt),
        refreshToken: json.refresh_token,
        refreshExpiresIn: json.refresh_expires_in,
        refreshTokenValidTill: new Date(json.refreshExpiresAt),
        namespaces: json.namespaces,
      },

      // properties that the real Cloud in Cloud.js adds that we need by default,
      //  but which might get overridden by the spec in `urlOrSpec`; these are
      //  getters (and sometimes setters) on the real Cloud in Cloud.js
      {
        _loaded: false, // NOTE: it's the DataCloud that eventually sets this to true
        _connecting: false,
        _connectError: null,
        _config: null,
        _updatingFromStore: false,
        ipcMain,
        fetching: false,
      },

      // what we got to make the Cloud instance from for testing purposes
      typeof urlOrSpec === 'string' ? { cloudUrl: urlOrSpec } : urlOrSpec
    );

    // check for special MOCK-only property that determines initial state so it's not
    //  necessary to always go through the connection sequence
    if (this.__mockStatus) {
      if (this.__mockStatus === CONNECTION_STATUSES.CONNECTED) {
        this.loaded = true;
        this.config = {};
        if (!this.token) {
          // assume tokens weren't given in spec: create some because they're necessary
          //  in order for the cloud to be determined 'connected'
          this.updateTokens(generateOAuthTokens());
        }
      } else if (this.__mockStatus === CONNECTION_STATUSES.CONNECTING) {
        this.connecting = true;
      }
    }

    // convert plain object namespaces into CloudNamespace instances if they aren't already
    this.namespaces = this.namespaces.map((ns) => {
      if (ns instanceof CloudNamespace) {
        return ns;
      }

      const cns = new CloudNamespace({
        cloudUrl: ns.cloudUrl,
        name: ns.name,
        synced: ns.synced,
      });
      cns.clusterCount = ns.clusterCount;
      cns.machineCount = ns.machineCount;
      cns.sshKeyCount = ns.sshKeyCount;
      cns.credentialCount = ns.credentialCount;
      cns.proxyCount = ns.proxyCount;
      cns.licenseCount = ns.licenseCount;

      return cns;
    });
  }

  get loaded() {
    return this._loaded;
  }

  set loaded(newValue) {
    if (this._loaded !== !!newValue) {
      this._loaded = !!newValue;
      this.dispatchEvent(CLOUD_EVENTS.LOADED_CHANGE, {
        isFromStore: this._updatingFromStore,
      });
      this.ipcMain?.notifyCloudLoadedChange(this.cloudUrl, this._loaded);
    }
  }

  get connecting() {
    return this._connecting;
  }

  set connecting(newValue) {
    if (this._connecting !== !!newValue) {
      this._connecting = !!newValue;
      this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, {
        isFromStore: this._updatingFromStore,
      });
      this.ipcMain?.notifyCloudStatusChange(this.cloudUrl, {
        connecting: this._connecting,
        connectError: this.connectError,
      });
    }
  }

  get connected() {
    return this.status === CONNECTION_STATUSES.CONNECTED;
  }

  get connectError() {
    return this._connectError;
  }

  set connectError(newValue) {
    const validValue =
      (newValue instanceof Error ? newValue.message : newValue) || null;
    if (validValue !== this._connectError) {
      this._connectError = validValue || null;
      this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, {
        isFromStore: this._updatingFromStore,
      });
      this.ipcMain?.notifyCloudStatusChange(this.cloudUrl, {
        connecting: this.connecting,
        connectError: this._connectError,
      });
    }
  }

  get config() {
    return this._config;
  }

  set config(newValue) {
    if (newValue !== this._config) {
      this._config = newValue || null;
      this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, {
        isFromStore: this._updatingFromStore,
      }); // affects status
    }
  }

  get status() {
    if (this.connecting) {
      return CONNECTION_STATUSES.CONNECTING;
    }

    if (!this.connectError && this.token && this.refreshTokenValid) {
      if (this.ipcMain && !this.config) {
        return CONNECTION_STATUSES.CONNECTING;
      }

      return CONNECTION_STATUSES.CONNECTED;
    }

    return CONNECTION_STATUSES.DISCONNECTED;
  }

  get ignoredProjects() {
    return this.namespaces.filter((ns) => !ns.synced).map((ns) => ns.name);
  }

  get syncedProjects() {
    return this.namespaces.filter((ns) => ns.synced).map((ns) => ns.name);
  }

  get syncedNamespaces() {
    return this.namespaces.filter((ns) => ns.synced);
  }

  update(spec, isFromStore = false) {
    this._updatingFromStore = !!isFromStore;

    // nothing to do for now

    this._updatingFromStore = false;
  }

  destroy() {
    // nothing to do in mock for now
  }

  get refreshTokenValid() {
    return !!this.refreshToken && !hasPassed(this.refreshTokenValidTill);
  }

  updateTokens(spec) {
    this.token = spec.id_token;
    this.expiresIn = spec.expires_in;
    this.tokenValidTill = new Date(spec.tokenExpiresAt);
    this.refreshToken = spec.refresh_token;
    this.refreshExpiresIn = spec.refresh_expires_in;
    this.refreshTokenValidTill = new Date(spec.refreshExpiresAt);

    // if all the above were getters/setters like in the real Cloud class,
    //  they would each dispatch these 2 events (except `username` which
    //  would dispatch only a TOKEN_CHANGE)
    this.dispatchEvent(CLOUD_EVENTS.TOKEN_CHANGE, {
      isFromStore: this._updatingFromStore,
    });
    this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, {
      isFromStore: this._updatingFromStore,
    });
  }

  resetTokens() {
    this.token = null;
    this.expiresIn = null;
    this.tokenValidTill = null;

    this.refreshToken = null;
    this.refreshExpiresIn = null;
    this.refreshTokenValidTill = null;

    // tokens are tied to the user, so clear that too
    this.username = null;

    // if all the above were getters/setters like in the real Cloud class,
    //  they would each dispatch these 2 events (except `username` which
    //  would dispatch only a TOKEN_CHANGE)
    this.dispatchEvent(CLOUD_EVENTS.TOKEN_CHANGE, {
      isFromStore: this._updatingFromStore,
    });
    this.dispatchEvent(CLOUD_EVENTS.STATUS_CHANGE, {
      isFromStore: this._updatingFromStore,
    });
  }

  async loadConfig(later = false) {
    if (later) {
      this.config = undefined; // indicate loading
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        this.config = {};
        this.connectError = null;
        resolve();
      }, 10);
    });
  }

  async connect() {
    return new Promise((resolve) => {
      if (this.connecting) {
        resolve();
        return;
      }

      // set initial values
      this.connecting = true;
      this.connectError = null;
      this.config = null;

      this.loadConfig().then(() => {
        if (this.config) {
          // simulate SSO connection
          setTimeout(() => {
            if (this.name === MOCK_CONNECT_FAILURE_CLOUD_NAME) {
              this.connectError = new Error('MOCK: cloud failed to connect');
              this.resetTokens();
            } else {
              this.updateTokens(generateOAuthTokens());
            }
            this.connecting = false;
            resolve();
          }, 10);
        } else {
          this.connecting = false;
          resolve();
        }
      });
    });
  }
}
