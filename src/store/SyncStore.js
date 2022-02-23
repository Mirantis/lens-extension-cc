import { observable, action, toJS, makeObservable } from 'mobx';
import { difference } from 'lodash';
import { Common } from '@k8slens/extensions';
import * as rtv from 'rtvjs';
import { logger } from '../util/logger';
import { credentialEntityModelTs } from '../catalog/CredentialEntity';
import { licenseEntityModelTs } from '../catalog/LicenseEntity';
import { proxyEntityModelTs } from '../catalog/ProxyEntity';
import { sshKeyEntityModelTs } from '../catalog/SshKeyEntity';

// don't know wjy, but structure like [[sshKeyEntityModelTs]] doesn't work
export const storeTs = {
  credentials: [
    rtv.EXPECTED,
    rtv.ARRAY,
    { $: [rtv.OBJECT, { ctor: credentialEntityModelTs }] },
  ],
  sshKeys: [
    rtv.EXPECTED,
    rtv.ARRAY,
    { $: [rtv.OBJECT, { ctor: sshKeyEntityModelTs }] },
  ],
  clusters: [rtv.ARRAY, rtv.ANY], // for now
  licenses: [
    rtv.EXPECTED,
    rtv.ARRAY,
    { $: [rtv.OBJECT, { ctor: licenseEntityModelTs }] },
  ],
  proxies: [
    rtv.EXPECTED,
    rtv.ARRAY,
    { $: [rtv.OBJECT, { ctor: proxyEntityModelTs }] },
  ],
};

export class SyncStore extends Common.Store.ExtensionStore {
  // NOTE: See main.ts#onActivate() and renderer.tsx#onActivate() where this.loadExtension()
  //  is called on the store instance in order to get Lens to load it from storage.

  // ultimately, we try to set this to the getExtensionFileFolder() directory that
  //  Lens gives the extension, but we don't know what it is until later
  // static defaultSavePath = null;

  @observable credentials;

  @observable sshKeys;

  @observable clusters;

  @observable licenses;

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

  /** Reset clouds to default empty object */
  reset() {
    const defaults = SyncStore.getDefaults();
    Object.keys(this).forEach((key) => (this[key] = defaults[key]));
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

    Object.keys(json).forEach((key) => {
      this[key] = json[key];
    });
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

  /**
   *
   * @param {string} type entity type
   * @param {Array<Object>} items array of entity items
   * @param {string} cloudUrl
   */
  findAndUpdateEntities = (type, items, cloudUrl) => {
    const existingCloudEntities = this[type].reduce((acc, en, index) => {
      if (en.metadata.cloudUrl === cloudUrl) {
        acc[en.metadata.uid] = { index, ...en };
        return acc;
      }
      return acc;
    }, {});
    const updatedEntities = [];

    items.forEach((item) => {
      const entity = item.toEntity();
      const { uid } = entity.metadata;
      if (existingCloudEntities[uid]) {
        updatedEntities.push(uid);
        this[type].splice(existingCloudEntities[uid].index, 1, entity);
      } else {
        this[type].push(entity);
      }
    });

    const uidToRemove = difference(
      Object.keys(existingCloudEntities),
      updatedEntities
    );
    this[type] = this[type].filter(
      (en) => !uidToRemove.includes(en.metadata.uid)
    );
  };
}

// create singleton instance, and export it for convenience (otherwise, one can also
//  import the exported CloudStore class and call CloudStore.getInstance())
export const syncStore = SyncStore.createInstance();
