/* istanbul ignore file */
import { CloudNamespace } from '../common/CloudNamespace';

export const makeFakeCloud = function (options) {
  const cloud = {
    ...options,
  };

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
