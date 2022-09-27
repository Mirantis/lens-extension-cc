import { observable, action, toJS, makeObservable } from 'mobx';
import { Common } from '@k8slens/extensions';
import * as rtv from 'rtvjs';
import { logger, logValue } from '../util/logger';
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

  /**
   * @member {boolean|undefined} isMainThread True if this store instance is running on the
   *  Main thread; false if it's on the Renderer thread. `undefined` until the store is
   *  loaded with the Extension via `loadExtension()`.
   */
  isMainThread; // NOT observable on purpose; set only once

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

  /**
   * Initializes the store with the extension.
   * @override
   * @param {Main.LensExtension|Renderer.LensExtension} extension Main or Renderer extension
   *  instance.
   * @param {boolean} [isMainThread] True if this store instance is on the Main thread.
   */
  loadExtension(extension, isMainThread) {
    this.isMainThread = !!isMainThread;
    super.loadExtension(extension);
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

  /**
   * Add syncedAt property to entity metadata if it's undefined
   */
  upgradeEntities(store) {
    Object.values(store).forEach((entities) => {
      if (Array.isArray(entities)) {
        entities.forEach((singleEntity) => {
          if (
            singleEntity &&
            typeof singleEntity.metadata === 'object' &&
            singleEntity.metadata !== null
          ) {
            if (!singleEntity.metadata.syncedAt) {
              singleEntity.metadata.syncedAt = new Date(0).toISOString();
            }
          }
        });
      }
    });
  }

  // NOTE: this method is not just called when reading from disk; it's also called in the
  //  sync process between the Main and Renderer threads should code on either thread
  //  update any of the store's properties
  @action // prevent mobx from emitting a change event until the function returns
  fromStore(store) {
    this.upgradeEntities(store);

    // NOTE: don't gate this with DEV_ENV because we want to do it every time so we
    //  can detect an invalid store JSON file that a user may have edited by hand
    const result = rtv.check({ store }, { store: storeTs });

    if (!result.valid) {
      logger.error(
        'SyncStore.fromStore()',
        `Invalid data found, will use defaults instead; error=${logValue(
          result.message
        )}`
      );
    }

    const json = result.valid ? store : SyncStore.getDefaults();

    logger.log(
      'SyncStore.fromStore()',
      `Updating store to: ${Object.entries(json)
        .map(([key, value]) => `${key}=${value.length}`)
        .join(', ')}`
    );

    Object.keys(json).forEach((key) => {
      this[key] = json[key];
    });

    logger.log(
      'SyncStore.fromStore()',
      // NOTE: just using defaults to iterate over expected keys we care about on `this`
      `Updated store to: ${Object.keys(SyncStore.getDefaults())
        .map((key) => `${key}=${this[key].length}`)
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
    // NOTE: it's not "pure JSON" void of Mobx proxy objects, however; the sole purpose of
    //  this is to let Lens serialize the store to the related JSON file on disk, however
    //  it does that
    return toJS(observableThis);
  }

  /** @returns {Object} A full clone to pure JSON of this store, void of all Mobx influence. */
  toPureJSON() {
    // throw-away: just to get keys we care about on this
    const defaults = SyncStore.getDefaults();

    const json = Object.keys(defaults).reduce((obj, key) => {
      obj[key] = JSON.parse(JSON.stringify(this[key]));
      return obj;
    }, {});

    return json;
  }
}

// create singleton instance, and export it for convenience (otherwise, one can also
//  import the exported CloudStore class and call CloudStore.getInstance())
export const syncStore = SyncStore.createInstance();
