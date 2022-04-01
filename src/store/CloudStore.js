import {
  observable,
  action,
  toJS,
  makeObservable,
  extendObservable,
} from 'mobx';
import { Common } from '@k8slens/extensions';
import * as rtv from 'rtvjs';
import { logger, logValue } from '../util/logger';
import { Cloud, CLOUD_EVENTS } from '../common/Cloud';

export const storeTs = {
  clouds: [rtv.HASH_MAP, { $values: Cloud.specTs }],
};

/** Stores Clouds. */
export class CloudStore extends Common.Store.ExtensionStore {
  // NOTE: See main.ts#onActivate() and renderer.tsx#onActivate() where this.loadExtension()
  //  is called on the store instance in order to get Lens to load it from storage.

  /** @member {{ [index: string]: Cloud }} clouds Map of Cloud URL to Cloud instance. */
  @observable clouds;

  /**
   * @member {IpcMain|undefined} ipcMain IpcMain singleton instance if this store instance
   *  is running on the MAIN thread; `undefined` if it's on the RENDERER thread. `undefined`
   *  until the store is loaded with the Extension via `loadExtension()`.
   */
  ipcMain; // NOT observable on purpose; set only once

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
   * Initializes the store with the extension.
   * @override
   * @param {Main.LensExtension|Renderer.LensExtension} extension Main or Renderer extension
   *  instance.
   * @param {IpcMain} [ipcMainInstance] IpcMain singleton instance if being loaded on the
   *  MAIN thread; `undefined` otherwise.
   */
  loadExtension(extension, ipcMainInstance) {
    this.ipcMain = ipcMainInstance;
    super.loadExtension(extension);
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
      logger.error(
        'CloudStore.fromStore()',
        `Invalid data found, will use defaults instead; error=${logValue(
          result.message
        )}`
      );
    }

    const json = result.valid ? store : CloudStore.getDefaults();

    logger.log(
      'CloudStore.fromStore()',
      `Updating store to: clouds=[${Object.keys(json.clouds).join(', ')}]`
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
              //  so that currently-bound objects don't leak and those watching for changes
              //  get notified by various Cloud events
              cloud = existingClouds[cloudUrl].update(cloudJson, true);
            } else {
              // add new Cloud we don't know about yet
              cloud = new Cloud(cloudJson, this.ipcMain);
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
            existingClouds[cloudUrl].destroy();
          }
        });

        // this assignment will implicitly remove any old clouds from the map since
        //  they won't be included in `newClouds`
        this.clouds = newClouds;
      } else {
        this[key] = json[key];
      }
    });

    logger.log(
      'CloudStore.fromStore()',
      `Updated store to: clouds=[${Object.keys(this.clouds).join(', ')}]`
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
    // NOTE: it's not "pure JSON" void of Mobx proxy objects, however; the sole purpose of
    //  this is to let Lens serialize the store to the related JSON file on disk, however
    //  it does that
    return toJS(observableThis);
  }

  /** @returns {Object} A full clone to pure JSON of this store, void of all Mobx influence. */
  toPureJSON() {
    // throw-away: just to get keys we care about on this
    const defaults = CloudStore.getDefaults();

    const json = Object.keys(defaults).reduce((obj, key) => {
      obj[key] = JSON.parse(JSON.stringify(this[key]));
      return obj;
    }, {});

    return json;
  }

  /**
   * Handles a change to any of the Cloud's properties (e.g. tokens were refreshed and now Cloud
   *  has a new set of tokens, synced namespaces changed, name changed, etc.).
   * @param {Object} event
   * @param {string} event.name
   * @param {Cloud} event.target
   * @param {Object} info
   * @param {boolean} info.isFromStore True if the update is emanating from this store;
   *  false if it's an actual update.
   */
  onCloudChange = ({ name, target: cloud }, { isFromStore }) => {
    if (!isFromStore) {
      logger.log(
        'CloudStore.onCloudChange()',
        `<${this.ipcMain ? 'MAIN' : 'RENDERER'}> Processing event=${logValue(
          name
        )} on cloud=${cloud}`
      );

      // NOTE: this event doesn't mean we have a new Cloud instance; it just means
      //  one or more properties of the Cloud object were changed, and by assigning
      //  a new shallow copy of the existing store, we'll trigger the Store to persist
      //  to disk, thereby capturing the Cloud's latest data in case the user quits Lens
      // CAUTION: https://alexhisen.gitbook.io/mobx-recipes/use-extendobservable-sparingly
      //  don't try `extendObservable(this.clouds, { [cloud.cloudUrl]: cloud })` because
      //  it won't work reliably (last it was used, only updates from the RENDERER thread
      //  where triggering a disk write; nothing from MAIN, for no readily-apparent reason)
      this.clouds = Object.assign({}, this.clouds, { [cloud.cloudUrl]: cloud });
    }
  };

  /**
   * Adds a Cloud to this store, notifying listeners bound to the `clouds` observable.
   * @param {Cloud} cloud
   * @throws {Error} If the cloud already exists in this store (based on URL).
   */
  addCloud(cloud) {
    const { cloudUrl } = cloud;
    if (this.clouds[cloudUrl]) {
      logger.error(
        'CloudStore.addCloud()',
        `Ignoring: Store already has an entry for url=${logValue(
          cloudUrl
        )}; existing=${this.clouds[cloudUrl]}, new=${cloud}`
      );
      return;
    }

    this.listenForChanges(cloud);
    extendObservable(this.clouds, { [cloudUrl]: cloud });
  }

  /**
   * Subscribes to a Cloud's change events to know when it gets updated __on this thread__
   *  and should be written to disk by this store.
   * @param {Cloud} cloud
   */
  listenForChanges(cloud) {
    // to avoid ping-pong between MAIN and RENDERER threads, especially when updating
    //  existing Clouds with updated store data, only subscribe to Cloud events that
    //  we expect to change on one thread or the other
    // NOTE: both threads must listen for SYNC changes because they both will affect
    //  the sync settings: MAIN will as a byproduct of discovering new namespaces
    //  and obtaining metadata on synced namespaces, and RENDERER will when the
    //  user changes the sync selection
    let eventNames;
    if (this.ipcMain) {
      logger.log(
        'CloudStore.listenForChanges()',
        `<MAIN> Subscribing to ALL EXCEPT loading/fetching/prop changes for cloud=${cloud}`
      );
      const excludedEvents = [
        CLOUD_EVENTS.LOADING_CHANGE, // not stored on disk
        CLOUD_EVENTS.FETCHING_CHANGE, // not stored on disk
        CLOUD_EVENTS.PROP_CHANGE, // not expected to change on MAIN
      ];
      eventNames = Object.values(CLOUD_EVENTS).filter(
        (eventName) => !excludedEvents.includes(eventName)
      );
    } else {
      logger.log(
        'CloudStore.listenForChanges()',
        `<RENDERER> Subscribing to ONLY sync and prop changes for cloud=${cloud}`
      );
      eventNames = [
        CLOUD_EVENTS.SYNC_CHANGE, // selective sync changes only happend on RENDERER
        CLOUD_EVENTS.PROP_CHANGE, // may change on RENDERER if we allow editing name
      ];
    }

    eventNames.forEach((eventName) =>
      cloud.addEventListener(eventName, this.onCloudChange)
    );
  }

  /**
   * Unsubscribes from a Cloud's change events.
   * @param {Cloud} cloud
   */
  stopListeningForChanges(cloud) {
    // noop if we weren't already subscribed
    Object.values(CLOUD_EVENTS).forEach((eventName) =>
      cloud.removeEventListener(eventName, this.onCloudChange)
    );
  }

  /**
   * Removes a Cloud from this store and destroys it. Does nothing if this store doesn't
   *  have a Cloud for this URL.
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
