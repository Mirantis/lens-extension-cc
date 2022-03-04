//
// Main Process IPC API
//

import { observable } from 'mobx';
import { Main } from '@k8slens/extensions';
import * as rtv from 'rtvjs';
import { logger } from '../util/logger';
import { ipcEvents } from '../constants';
import { SshKeyEntity, sshKeyEntityModelTs } from '../catalog/SshKeyEntity';
import {
  CredentialEntity,
  credentialEntityModelTs,
} from '../catalog/CredentialEntity';
import { ProxyEntity, proxyEntityModelTs } from '../catalog/ProxyEntity';
import { LicenseEntity, licenseEntityModelTs } from '../catalog/LicenseEntity';
import * as consts from '../constants';

// typeset for the capture() method
const captureTs = {
  level: [rtv.STRING, { oneOf: Object.keys(console) }],
  context: rtv.STRING,
  message: rtv.STRING,
};

export const catalogSource = observable.array([]);

export class IpcMain extends Main.Ipc {
  /**
   * @param {Main.LensExtension} extension
   */
  constructor(extension) {
    super(extension);

    extension.addCatalogSource(consts.catalog.source, catalogSource);
  }

  /**
   * Logs a message to the `logger` and broadcasts it to the Renderer so that it can
   *  be seen in the Renderer's DevTools console, which can be seen even in the installed
   *  version of Lens (as opposed to having to run Lens locally from source to access
   *  the main thread's DevTools console to see the logs).
   *
   * NOTE: The IPC bridge isn't setup immediately when the extension is activated, so
   *  calls to this method will be a noop until the bridge is established, resulting
   *  in missing log statements (if you're only looking for them on the Renderer side).
   *
   * @param {string} level Logger/console method, e.g. 'log' or 'warn'.
   * @param {string} context Identifies where the message came from, e.g. 'methodName()'.
   * @param {string} message Log message.
   * @param {...any} rest Anything else to pass to the Logger to be printed as data
   *  or parsed with '%s' placeholders in the message (same as `console` API).
   */
  capture(level, context, message, ...rest) {
    DEV_ENV && rtv.verify({ level, context, message }, captureTs);

    const params = [`[MAIN] ${context}`, message, ...rest];
    logger[level](...params);
    this.broadcast(ipcEvents.broadcast.LOGGER, level, ...params);
  }

  // DEBUG REMOVE
  /**
   * Adds fake/dummy items to the Catalog for testing.
   */
  addFakeItems() {
    if (!DEV_ENV) {
      return;
    }

    //// SSH KEYS

    const sshKeyModels = [
      {
        kind: 'PublicKey',
        metadata: {
          source: consts.catalog.source,
          uid: 'sshkey-uid-1',
          name: 'SSH Key 1',
          namespace: 'lex-ns-1',
          cloudUrl: 'https://container-cloud.acme.com',
          labels: {
            managementCluster: 'mcc-1',
            project: 'project-1',
          },
        },
        spec: {
          createdAt: '2021-12-03T20:38:04Z',
          publicKey: 'sshkey-public-key-1',
        },
        status: {
          phase: 'available',
        },
      },
      {
        kind: 'PublicKey',
        metadata: {
          source: consts.catalog.source,
          uid: 'sshkey-uid-2',
          name: 'SSH Key 2',
          namespace: 'lex-ns-2',
          cloudUrl: 'https://container-cloud.acme.com',
          labels: {
            managementCluster: 'mcc-1',
            project: 'project-1',
          },
        },
        spec: {
          createdAt: '2021-12-03T20:38:04Z',
          publicKey: 'sshkey-public-key-2',
        },
        status: {
          phase: 'available',
        },
      },
    ];

    DEV_ENV && rtv.verify(sshKeyModels, [[sshKeyEntityModelTs]]);

    sshKeyModels.forEach((model) => {
      this.capture(
        'log',
        'addFakeItems()',
        `adding ssh key to catalog, keyId=${model.metadata.uid}, name=${model.metadata.name}, namespace=${model.metadata.namespace}`
      );
      catalogSource.push(new SshKeyEntity(model));
    });

    //// CREDENTIALS

    const credentialModels = [
      {
        kind: 'AWSCredential',
        metadata: {
          source: consts.catalog.source,
          uid: 'credential-uid-1',
          name: 'Credential 1',
          namespace: 'lex-ns-1',
          cloudUrl: 'https://container-cloud.acme.com',
          labels: {
            managementCluster: 'mcc-1',
            project: 'project-1',
          },
        },
        spec: {
          provider: 'aws',
          region: 'eu',
          valid: true,
          createdAt: '2021-12-03T20:38:04Z',
        },
        status: {
          phase: 'available',
        },
      },
      {
        kind: 'AzureCredential',
        metadata: {
          source: consts.catalog.source,
          uid: 'credential-uid-2',
          name: 'Credential 2',
          namespace: 'lex-ns-2',
          cloudUrl: 'https://container-cloud.acme.com',
          labels: {
            managementCluster: 'mcc-1',
            project: 'project-1',
          },
        },
        spec: {
          provider: 'azure',
          region: 'cz',
          valid: false,
          createdAt: '2021-12-03T20:38:04Z',
        },
        status: {
          phase: 'available',
        },
      },
    ];

    DEV_ENV && rtv.verify(credentialModels, [[credentialEntityModelTs]]);

    credentialModels.forEach((model) => {
      this.capture(
        'log',
        'addFakeItems()',
        `adding credential to catalog, keyId=${model.metadata.uid}, name=${model.metadata.name}, namespace=${model.metadata.namespace}`
      );
      catalogSource.push(new CredentialEntity(model));
    });

    //// PROXIES

    const proxyModels = [
      {
        kind: 'Proxy',
        metadata: {
          source: consts.catalog.source,
          uid: 'proxy-uid-1',
          name: 'Proxy 1',
          namespace: 'lex-ns-1',
          cloudUrl: 'https://container-cloud.acme.com',
          labels: {
            managementCluster: 'mcc-1',
            project: 'project-1',
          },
        },
        spec: {
          region: 'aws-us-east-1',
          httpProxy: 'http://east.proxy.com',
          httpsProxy: 'https://east.proxy.com',
          createdAt: '2021-12-03T20:38:04Z',
        },
        status: {
          phase: 'available',
        },
      },
      {
        kind: 'Proxy',
        metadata: {
          source: consts.catalog.source,
          uid: 'proxy-uid-2',
          name: 'Proxy 2',
          namespace: 'lex-ns-2',
          cloudUrl: 'https://container-cloud.acme.com',
          labels: {
            managementCluster: 'mcc-1',
            project: 'project-1',
          },
        },
        spec: {
          region: 'aws-us-west-1',
          httpProxy: 'http://west.proxy.com',
          httpsProxy: 'https://west.proxy.com',
          createdAt: '2021-12-03T20:38:04Z',
        },
        status: {
          phase: 'available',
        },
      },
    ];

    DEV_ENV && rtv.verify(proxyModels, [[proxyEntityModelTs]]);

    proxyModels.forEach((model) => {
      this.capture(
        'log',
        'addFakeItems()',
        `adding proxy to catalog, keyId=${model.metadata.uid}, name=${model.metadata.name}, namespace=${model.metadata.namespace}`
      );
      catalogSource.push(new ProxyEntity(model));
    });

    //// LICENSES

    const licenseModels = [
      {
        kind: 'RHELLicense',
        metadata: {
          source: consts.catalog.source,
          uid: 'license-uid-1',
          name: 'License 1',
          namespace: 'lex-ns-1',
          cloudUrl: 'https://container-cloud.acme.com',
          labels: {
            managementCluster: 'mcc-1',
            project: 'project-1',
          },
        },
        spec: {
          createdAt: '2021-12-03T20:38:04Z',
        },
        status: {
          phase: 'available',
        },
      },
      {
        kind: 'RHELLicense',
        metadata: {
          source: consts.catalog.source,
          uid: 'license-uid-2',
          name: 'License 2',
          namespace: 'lex-ns-2',
          cloudUrl: 'https://container-cloud.acme.com',
          labels: {
            managementCluster: 'mcc-1',
            project: 'project-1',
          },
        },
        spec: {
          createdAt: '2021-12-03T20:38:04Z',
        },
        status: {
          phase: 'available',
        },
      },
    ];

    DEV_ENV && rtv.verify(licenseModels, [[licenseEntityModelTs]]);

    licenseModels.forEach((model) => {
      this.capture(
        'log',
        'addFakeItems()',
        `adding license to catalog, keyId=${model.metadata.uid}, name=${model.metadata.name}, namespace=${model.metadata.namespace}`
      );
      catalogSource.push(new LicenseEntity(model));
    });
  }
}
