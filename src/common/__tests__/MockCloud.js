import { EventDispatcher } from '../EventDispatcher';
import { CloudNamespace } from '../CloudNamespace';

const makeFakeCloud = function (props) {
  const cloud = {
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
  };

  Object.assign(cloud, props);

  // convert plain object namespaces into CloudNamespace instances if they aren't already
  cloud.namespaces = cloud.namespaces.map((ns) => {
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

  return cloud;
};

export class Cloud extends EventDispatcher {
  constructor(urlOrSpec, options) {
    super();
    const fakeCloud = makeFakeCloud(
      typeof urlOrSpec === 'string'
        ? { cloudUrl: urlOrSpec, ...options }
        : urlOrSpec
    );

    // now apply all `fakeCloud` properties to this class instance
    Object.keys(fakeCloud).forEach((key) => (this[key] = fakeCloud[key]));
  }

  get syncedNamespaces() {
    return this.namespaces.filter((ns) => ns.synced);
  }

  destroy() {
    // nothing to do in mock for now
  }
}
