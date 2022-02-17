//
// Cluster storage to persist clusters added to the Catalog by this extension
//

import { observable, action, toJS, makeObservable } from 'mobx';
import { Common } from '@k8slens/extensions';
import * as rtv from 'rtvjs';
import { logger } from '../util/logger';
import { clusterEntityModelTs } from '../typesets';

/** RTV.js typeset for preferences model. */
export const storeTs = {
  /** List of models representing each cluster in the Catalog added by this extension. */
  models: [[clusterEntityModelTs]],
};

/** Preferences auto-persisted by Lens. Singleton. Use `getInstance()` static method. */
export class ClusterStore extends Common.Store.ExtensionStore {
  // NOTE: See main.ts#onActivate() and renderer.tsx#onActivate() where this.loadExtension()
  //  is called on the store instance in order to get Lens to load it from storage.

  static getDefaults() {
    return {
      models: [],
    };
  }

  /**
   * List of onUpdate handlers to be called whenever this store gets updated from disk.
   * @type {Array<Function>}
   */
  updateHandlers = [];

  /**
   * [Stored]
   * @property {Array<ClusterModel>} models List of models representing each cluster in
   *  the Catalog added by this extension.
   */
  @observable models;

  constructor() {
    super({
      configName: 'cluster-store',
      defaults: ClusterStore.getDefaults(),
    });
    makeObservable(this);
  }

  /** Reset all preferences to their default values. */
  reset() {
    const defaults = ClusterStore.getDefaults();
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
        'ClusterStore.fromStore()',
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
    const defaults = ClusterStore.getDefaults();

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
//  import the exported ClusterStore class and call ClusterStore.getInstance())
export const clusterStore = ClusterStore.createInstance();
