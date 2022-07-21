import { EventDispatcher } from '../EventDispatcher';
import { CloudNamespace } from '../CloudNamespace';

const makeFakeCloud = function (props) {
  const cloud = {};

  Object.keys(props).forEach((key) => (cloud[key] = props[key]));

  // check if `props` has `namespaces` and `syncedNamespaces` and convert the plain
  //  objects into CloudNamespace instances
  ['namespaces', 'syncedNamespaces'].forEach((prop) => {
    if (cloud[prop]) {
      cloud[prop] = cloud[prop].map((ns) => {
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
}
