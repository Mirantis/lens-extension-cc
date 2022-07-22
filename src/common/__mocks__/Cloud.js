import { EventDispatcher } from '../EventDispatcher';
import { CloudNamespace } from '../CloudNamespace';

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

export const mkCloudJson = (props) =>
  Object.assign(
    {
      // NOTE: these properties are the ones required by Cloud.specTs in the real Cloud.js
      cloudUrl: 'http://cloud.url',
      name: 'cloud-name',
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

export class Cloud extends EventDispatcher {
  constructor(urlOrSpec, ipcMain) {
    super();

    if (!urlOrSpec) {
      throw new Error(
        'FAKE CLOUD still requires a URL or a spec when being created'
      );
    }

    // create most of the instance by assigning onto it properties from the spec
    //  given to the constructor, relying on a default cloud JSON if a URL was
    //  given instead of the spec
    Object.assign(
      this,

      // defaults
      mkCloudJson(),

      // properties that the real Cloud in Cloud.js adds that we need by default,
      //  but which might get overridden by the spec in `urlOrSpec`; these are
      //  getters on the real Cloud in Cloud.js, but just straight properties here
      {
        loaded: false,
        connected: false,
      },

      // what we got to make the Cloud instance from for testing purposes
      typeof urlOrSpec === 'string' ? { cloudUrl: urlOrSpec } : urlOrSpec
    );

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

  get syncedNamespaces() {
    return this.namespaces.filter((ns) => ns.synced);
  }

  update() {
    // nothing to do in mock for now
  }

  destroy() {
    // nothing to do in mock for now
  }
}
