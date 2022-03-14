import { observable, action, toJS, makeObservable } from 'mobx';
import { Common } from '@k8slens/extensions';
import * as rtv from 'rtvjs';
import { logger } from '../util/logger';
import { clusterEntityModelTs } from '../catalog/catalogEntities';
import { credentialEntityModelTs } from '../catalog/CredentialEntity';
import { licenseEntityModelTs } from '../catalog/LicenseEntity';
import { proxyEntityModelTs } from '../catalog/ProxyEntity';
import { sshKeyEntityModelTs } from '../catalog/SshKeyEntity';

export const storeTs = {
  credentials: [[credentialEntityModelTs]],
  sshKeys: [[sshKeyEntityModelTs]],
  clusters: [[clusterEntityModelTs]],
  licenses: [[licenseEntityModelTs]],
  proxies: [[proxyEntityModelTs]],
};

/** Stores Catalog Entity Models sorted by type. */
export class SyncStore extends Common.Store.ExtensionStore {
  // NOTE: See main.ts#onActivate() and renderer.tsx#onActivate() where this.loadExtension()
  //  is called on the store instance in order to get Lens to load it from storage.

  // ultimately, we try to set this to the getExtensionFileFolder() directory that
  //  Lens gives the extension, but we don't know what it is until later
  // static defaultSavePath = null;

  /**
   * @member {Array} credentials List of Catalog Entity Models that match
   *  `credentialEntityModelTs`.
   */
  @observable credentials;

  /**
   * @member {Array} sshKeys List of Catalog Entity Models that match
   *  `sshKeyEntityModelTs`.
   */
  @observable sshKeys;

  /**
   * @member {Array} clusters List of Catalog Entity Models that match
   *  `clusterEntityModelTs`.
   */
  @observable clusters;

  /**
   * @member {Array} licenses List of Catalog Entity Models that match
   *  `licenseEntityModelTs`.
   */
  @observable licenses;

  /**
   * @member {Array} proxies List of Catalog Entity Models that match
   *  `proxyEntityModelTs`.
   */
  @observable proxies;

  static getDefaults() {
    return {
      credentials: [],
      sshKeys: [],
      clusters: [],
      licenses: [],
      proxies: [],
    };
  }

  constructor() {
    super({
      configName: 'sync-store',
      defaults: SyncStore.getDefaults(),
    });
    makeObservable(this);
  }

  /** Reset properties to default empty object */
  reset() {
    const defaults = SyncStore.getDefaults();
    Object.keys(this).forEach((key) => (this[key] = defaults[key]));
  }

  /**
   * @returns {Array<string>} Array of property names that are entity model lists
   *  on this instance.
   */
  getListNames() {
    return Object.keys(SyncStore.getDefaults()).filter((name) =>
      Array.isArray(this[name])
    );
  }

  // NOTE: this method is not just called when reading from disk; it's also called in the
  //  sync process between the Main and Renderer threads should code on either thread
  //  update any of the store's properties
  @action // prevent mobx from emitting a change event until the function returns
  fromStore(store) {
    const result = rtv.check({ store }, { store: storeTs });

    if (!result.valid) {
      logger.error(
        'SyncStore.fromStore()',
        `Invalid data found, error="${result.message}"`
      );
    }

    const json = result.valid ? store : SyncStore.getDefaults();

    logger.log(
      'SyncStore.fromStore()',
      `Updating store: ${Object.entries(json)
        .map(([key, value]) => `${key}=${value.length}`)
        .join(', ')}`
    );

    Object.keys(json).forEach((key) => {
      this[key] = json[key];
    });

    logger.log(
      'SyncStore.fromStore()',
      `Store updated: ${Object.entries(json)
        .map(([key, value]) => `${key}=${value.length}`)
        .join(', ')}`
    );
  }

  toJSON() {
    // throw-away: just to get keys we care about on this
    const defaults = SyncStore.getDefaults();

    const observableThis = Object.keys(defaults).reduce((obj, key) => {
      obj[key] = this[key];
      return obj;
    }, {});

    // return a deep-clone that is no longer observable
    return toJS(observableThis);
  }
}

// create singleton instance, and export it for convenience (otherwise, one can also
//  import the exported CloudStore class and call CloudStore.getInstance())
export const syncStore = SyncStore.createInstance();
