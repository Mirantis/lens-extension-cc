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

    Object.keys(json).forEach((key) => {
      if (key === 'clouds') {
        // restore from a map of cloudUrl to JSON object -> into a map of cloudUrl
        //  to Cloud instance
        this[key] = Object.entries(json[key] || {}).reduce(
          (cloudMap, [cloudUrl, cloudJson]) => {
            const cloud = new Cloud(cloudJson);
            cloud.addEventListener(
              CLOUD_EVENTS.DATA_UPDATED,
              this.onCloudUpdate
            );
            cloudMap[cloudUrl] = cloud;
            return cloudMap;
          },
          {}
        );
      } else {
        this[key] = json[key];
      }
    });
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
   * @param {Cloud} cloud
   */
  onCloudUpdate = (cloud) => {
    extendObservable(this.clouds, { [cloud.cloudUrl]: cloud });
  };

  /**
   * @param {Cloud} cloud
   */
  addCloud(cloud) {
    const { cloudUrl } = cloud;
    cloud.addEventListener(CLOUD_EVENTS.DATA_UPDATED, this.onCloudUpdate);
    extendObservable(this.clouds, { [cloudUrl]: cloud });
  }
  /**
   * @param {string} cloudUrl
   */
  removeCloud(cloudUrl) {
    this.clouds[cloudUrl].removeEventListener(
      CLOUD_EVENTS.DATA_UPDATED,
      this.onCloudUpdate
    );
    delete this.clouds[cloudUrl];
  }
}

// create singleton instance, and export it for convenience (otherwise, one can also
//  import the exported CloudStore class and call CloudStore.getInstance())
export const cloudStore = CloudStore.createInstance();
