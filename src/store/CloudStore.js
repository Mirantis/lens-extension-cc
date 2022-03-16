import {
  observable,
  action,
  toJS,
  makeObservable,
  extendObservable,
} from 'mobx';
import { Common } from '@k8slens/extensions';
import * as rtv from 'rtvjs';
import { logger } from '../util/logger';
import { Cloud, CLOUD_EVENTS } from '../common/Cloud';

export const storeTs = {
  clouds: [rtv.HASH_MAP, { $values: Cloud.specTs }],
};

/** Stores Clouds. */
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

  /** Reset clouds to default empty object */
  reset() {
    const defaults = CloudStore.getDefaults();
    Object.keys(this).forEach((key) => (this[key] = defaults[key]));
  }

  // NOTE: this method is not just called when reading from disk; it's also called in the
  //  sync process between the Main and Renderer threads should code on either thread
  //  update any of the store's properties
  @action // prevent mobx from emitting a change event until the function returns
  fromStore(store) {
    // NOTE: don't gate this with DEV_ENV because we want to do it every time so we
    //  can detect an invalid store JSON file that a user may have edited by hand
    const result = rtv.check({ store }, { store: storeTs });

    if (!result.valid) {
      logger.log(
        'CloudStore.fromStore()',
        `Invalid data found, error="${result.message}"`
      );
    }

    const json = result.valid ? store : CloudStore.getDefaults();

    logger.log(
      'CloudStore.fromStore()',
      `Updating store: clouds=[${Object.keys(store.clouds).join(', ')}]`
    );

    Object.keys(json).forEach((key) => {
      if (key === 'clouds') {
        // restore from a map of cloudUrl to JSON object -> into a map of cloudUrl
        //  to Cloud instance
        const existingClouds = this.clouds || {};
        const newClouds = Object.entries(json[key] || {}).reduce(
          (cloudMap, [cloudUrl, cloudJson]) => {
            let cloud;
            if (existingClouds[cloudUrl]) {
              // update existing Cloud with new data instead of creating a new instance
              //  so that currently-bound objects don't leak
              cloud = existingClouds[cloudUrl].update(cloudJson);
            } else {
              // add new Cloud we don't know about yet
              cloud = new Cloud(cloudJson);
              this.listenForChanges(cloud);
            }
            cloudMap[cloudUrl] = cloud;
            return cloudMap;
          },
          {}
        );

        // make sure we properly remove any old/deleted Clouds
        Object.keys(existingClouds).forEach((cloudUrl) => {
          if (!newClouds[cloudUrl]) {
            this.stopListeningForChanges(existingClouds[cloudUrl]);
          }
        });

        // this assignment will implicitly remove any old clouds from the map
        //  they won't be included in `newClouds`
        this.clouds = newClouds;
      } else {
        this[key] = json[key];
      }
    });

    logger.log(
      'CloudStore.fromStore()',
      `Store updated: clouds=[${Object.keys(store.clouds).join(', ')}]`
    );
  }

  toJSON() {
    // throw-away: just to get keys we care about on this
    const defaults = CloudStore.getDefaults();

    const observableThis = Object.keys(defaults).reduce((obj, key) => {
      if (key === 'clouds') {
        // store from map of cloudUrl to Cloud instance -> into a map of cloudUrl
        //  to JSON object
        obj[key] = Object.keys(this[key]).reduce((jsonMap, cloudUrl) => {
          jsonMap[cloudUrl] = this[key][cloudUrl].toJSON();
          return jsonMap;
        }, {});
      } else {
        obj[key] = this[key];
      }
      return obj;
    }, {});

    // return a deep-clone that is no longer observable
    return toJS(observableThis);
  }

  /**
   * Handles a change to any of the Cloud's properties (e.g. tokens were refreshed and now Cloud
   *  has a new set of tokens, synced namespaces changed, name changed, etc.).
   * @param {Cloud} cloud
   */
  onCloudUpdate = (cloud) => {
    // NOTE: this event doesn't mean we have a new Cloud instance; it just means
    //  one or more properties of the Cloud object were changed, and by using
    //  `extendObservable()` here, we'll trigger the Store to persist to disk,
    //  thereby capturing the Cloud's latest data in case the user quits Lens
    extendObservable(this.clouds, { [cloud.cloudUrl]: cloud });
  };

  /**
   * Adds a Cloud to this store, notifying listeners bound to the `clouds` observable.
   * @param {Cloud} cloud
   * @throws {Error} If the cloud already exists in this store (based on URL).
   */
  addCloud(cloud) {
    const { cloudUrl } = cloud;
    if (this.clouds[cloudUrl]) {
      throw new Error(
        `Store already has an entry for url="${cloudUrl}", existing=${this.clouds[cloudUrl]}, new=${cloud}`
      );
    }

    this.listenForChanges(cloud);
    extendObservable(this.clouds, { [cloudUrl]: cloud });
  }

  /**
   * Subscribes to a Cloud's change events to know when it gets updated and should
   *  be written to disk via this store.
   * @param {Cloud} cloud
   */
  listenForChanges(cloud) {
    Object.values(CLOUD_EVENTS).forEach((eventName) =>
      cloud.addEventListener(eventName, this.onCloudUpdate)
    );
  }

  /**
   * Unsubscribes from a Cloud's change events.
   * @param {Cloud} cloud
   */
  stopListeningForChanges(cloud) {
    Object.values(CLOUD_EVENTS).forEach((eventName) =>
      cloud.removeEventListener(eventName, this.onCloudUpdate)
    );
  }

  /**
   * Removes a Cloud from this store. Does nothing if this store doesn't have a Cloud
   *  for this URL.
   * @param {string} cloudUrl
   */
  removeCloud(cloudUrl) {
    const cloud = this.clouds[cloudUrl];
    if (cloud) {
      this.stopListeningForChanges(cloud);
      cloud.destroy();
      delete this.clouds[cloudUrl];
    }
  }
}

// create singleton instance, and export it for convenience (otherwise, one can also
//  import the exported CloudStore class and call CloudStore.getInstance())
export const cloudStore = CloudStore.createInstance();
