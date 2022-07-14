/* istanbul ignore file */
import { CloudNamespace } from '../common/CloudNamespace';
import { EventDispatcher } from '../common/EventDispatcher';

export const makeFakeCloud = function (props) {
  // a Cloud is expected to be an EventDispatcher, so start from there
  const cloud = new EventDispatcher();

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
