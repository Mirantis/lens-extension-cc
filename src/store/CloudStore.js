import { observable, toJS, makeObservable, extendObservable } from 'mobx';
import { Common } from '@k8slens/extensions';
import * as rtv from 'rtvjs';
import { logger } from '../util/logger';
import { Cloud, CLOUD_EVENTS } from '../common/Cloud';

export const storeTs = {
  clouds: [rtv.HASH_MAP, { $values: Cloud.specTs }],
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
    }

    const json = result.valid ? store : CloudStore.getDefaults();

    console.log('+++++++ CloudStore.fromStore()'); // DEBUG LOG

    Object.keys(json).forEach((key) => {
      if (key === 'clouds') {
        // restore from a map of cloudUrl to JSON object -> into a map of cloudUrl
        //  to Cloud instance
        if (!this.clouds) {
          this.clouds = Object.entries(json[key] || {}).reduce(
            (cloudMap, [cloudUrl, cloudJson]) => {
              const cloud = new Cloud(cloudJson);
              this.listenForChanges(cloud);
              cloudMap[cloudUrl] = cloud;
              return cloudMap;
            },
            {}
          );
        }
        // else, `fromStore()` is being called as a result of Lens' periodic sync process with
        //  the file system -- but we don't support updating Clouds this way; if the user
        //  makes a change on disk, it'll be overwritten by this Store when Lens serializes
        //  it, or the user will need to close Lens, make the edit, and re-open it
      } else {
        this[key] = json[key];
      }
    });
  }

  toJSON() {
    // throw-away: just to get keys we care about on this
    const defaults = CloudStore.getDefaults();

    console.log('+++++++ CloudStore.toJSON()'); // DEBUG LOG

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
    console.log(
      '+++++++ CloudStore.onCloudUpdate(): cloud=%s',
      cloud.toString()
    ); // DEBUG LOG
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
   * Removes a Cloud from this store. Does nothing if this store doesn't have a Cloud
   *  for this URL.
   * @param {string} cloudUrl
   */
  removeCloud(cloudUrl) {
    const cloud = this.clouds[cloudUrl];
    if (cloud) {
      Object.values(CLOUD_EVENTS).forEach((eventName) =>
        cloud.removeEventListener(eventName, this.onCloudUpdate)
      );
      delete this.clouds[cloudUrl];
    }
  }
}

// create singleton instance, and export it for convenience (otherwise, one can also
//  import the exported CloudStore class and call CloudStore.getInstance())
export const cloudStore = CloudStore.createInstance();
