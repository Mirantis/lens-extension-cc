//
// Preferences management that uses a Lens Store for persistence
//

import { observable, toJS } from 'mobx';
import { Store } from '@k8slens/extensions';
import * as rtv from 'rtvjs';

/** RTV.js typeset for preferences model. */
export const preferencesTs = {
  /** MCC instance URL, does NOT end with a slash. */
  cloudUrl: [
    rtv.EXPECTED,
    rtv.STRING,
    (v) => {
      if (v && v.match(/\/$/)) {
        throw new Error('cloudUrl must not end with a slash');
      }
    },
  ],

  /** Username used for authentication purposes to the MCC instance. */
  username: [rtv.EXPECTED, rtv.STRING],

  /** Absolute path where kubeconfigs are to be saved. */
  savePath: [rtv.EXPECTED, rtv.STRING],

  /**
   * If true, the refresh token generated for the clusters will be enabled for
   *  offline access. WARNING: This is less secure than a normal refresh token as
   *  it will never expire.
   */
  offline: [rtv.EXPECTED, rtv.BOOLEAN],

  /**
   * If true, the clusters will be added to new (or existing if the workspaces already
   *  exist) workspaces that correlate to their original MCC namespaces; otherwise,
   *  they will all be added to the active workspace.
   */
  addToNew: [rtv.EXPECTED, rtv.BOOLEAN],
};

/** Preferences auto-persisted by Lens. Singleton. Use `getInstance()` static method. */
export class PreferencesStore extends Store.ExtensionStore {
  // NOTE: See renderer.tsx#onActivate() where this.loadExtension() is called on
  //  the store instance in order to get Lens to load it from storage.

  // ultimately, we try to set this to the getExtensionFileFolder() directory that
  //  Lens gives the extension, but we don't know what it is until later
  static defaultSavePath = null;

  static getDefaults() {
    return {
      cloudUrl: null,
      username: null,
      savePath: PreferencesStore.defaultSavePath,
      offline: true,
      addToNew: true,
    };
  }

  @observable cloudUrl;
  @observable username;
  @observable savePath;
  @observable offline;
  @observable addToNew;

  constructor() {
    super({
      configName: 'preferences-store',
      defaults: PreferencesStore.getDefaults(),
    });
  }

  /** Reset all preferences to their default values. */
  reset() {
    const defaults = PreferencesStore.getDefaults();
    Object.keys(this).forEach((key) => (this[key] = defaults[key]));
  }

  fromStore(store) {
    const result = rtv.check({ store }, { store: preferencesTs });

    if (!result.valid) {
      // eslint-disable-next-line no-console -- log error
      console.error(
        `[PreferencesStore] Invalid preferences found, error="${result.message}"`
      );

      return;
    }

    Object.keys(store).forEach((key) => (this[key] = store[key]));
  }

  toJSON() {
    // throw-away: just to get keys we care about on this
    const defaults = PreferencesStore.getDefaults();

    const observableThis = Object.keys(defaults).reduce((obj, key) => {
      obj[key] = this[key];
      return obj;
    }, {});

    // return a deep-clone that is no longer observable
    return toJS(observableThis, { recurseEverything: true });
  }
}

// singleton instance, for convenience
export const prefStore = PreferencesStore.getInstance();
