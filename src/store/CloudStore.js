import { observable, toJS, makeObservable } from 'mobx';
import { Common } from '@k8slens/extensions';
import * as rtv from 'rtvjs';
import { logger } from '../util/logger';

// we cannot use Cloud.specTs because they have different props.
// probably we don't need all of them, or need additional. Will see in process
// eslint-disable-next-line no-unused-vars
const cloudTs = {
  token: [rtv.REQUIRED, rtv.STRING],
  expiresIn: [rtv.REQUIRED, rtv.SAFE_INT], // SECONDS valid from now
  refreshToken: [rtv.REQUIRED, rtv.STRING],
  refreshExpiresIn: [rtv.REQUIRED, rtv.SAFE_INT], // SECONDS valid from now

  refreshTokenValidTill: [rtv.REQUIRED, rtv.STRING],
  tokenValidTill: [rtv.REQUIRED, rtv.STRING],

  username: [rtv.OPTIONAL, rtv.STRING],
  // IDP client associated with current tokens; undefined if unknown; null if not specified
  idpClientId: [rtv.OPTIONAL, rtv.STRING],

  // URL to the MCC instance
  cloudUrl: [rtv.REQUIRED, rtv.STRING],
};

export const storeTs = {
  // clouds: [rtv.HASH_MAP, { $values: cloudTs }]
  clouds: [rtv.OBJECT],
};

export class CloudStore extends Common.Store.ExtensionStore {
  // NOTE: See main.ts#onActivate() and renderer.tsx#onActivate() where this.loadExtension()
  //  is called on the store instance in order to get Lens to load it from storage.

  // ultimately, we try to set this to the getExtensionFileFolder() directory that
  //  Lens gives the extension, but we don't know what it is until later
  // static defaultSavePath = null;

  @observable clouds;

  static getDefaults() {
    return {
      clouds: {},
    };
  }

  constructor() {
    super({
      configName: 'cloud-store',
      defaults: CloudStore.getDefaults(),
    });
    makeObservable(this);
  }

  /**
   * List of onUpdate handlers to be called whenever this store gets updated from disk.
   * @type {Array<Function>}
   */
  updateHandlers = [];

  /** Reset clouds to default empty object */
  reset() {
    const defaults = CloudStore.getDefaults();
    Object.keys(this).forEach((key) => (this[key] = defaults[key]));
  }

  fromStore(store) {
    const result = rtv.check({ store }, { store: storeTs });

    if (!result.valid) {
      logger.error(
        'CloudStore.fromStore()',
        `Invalid data found, error="${result.message}"`
      );
      return;
    }

    Object.keys(store).forEach((key) => (this[key] = store[key]));
    // call any onUpdate() handlers
    this.updateHandlers.forEach((h) => h());
  }

  toJSON() {
    // throw-away: just to get keys we care about on this
    const defaults = CloudStore.getDefaults();

    const observableThis = Object.keys(defaults).reduce((obj, key) => {
      obj[key] = this[key];
      return obj;
    }, {});

    // return a deep-clone that is no longer observable
    return toJS(observableThis);
  }

  /**
   * Adds an onUpdate() handler if it hasn't already been added. This handler
   *  will be called whenever this store is updated from disk.
   * @param {Function} handler
   */
  addUpdateHandler(handler) {
    if (!this.updateHandlers.find((h) => h === handler)) {
      this.updateHandlers.push(handler);
    }
  }

  /**
   * Removes an onUpdate() handler if it's currently in the list.
   * @param {Function} handler
   */
  removeUpdateHandler(handler) {
    const idx = this.updateHandlers.findIndex((h) => h === handler);
    if (idx >= 0) {
      this.updateHandlers.splice(idx, 1);
    }
  }
}

// create singleton instance, and export it for convenience (otherwise, one can also
//  import the exported CloudStore class and call CloudStore.getInstance())
export const cloudStore = CloudStore.createInstance();
