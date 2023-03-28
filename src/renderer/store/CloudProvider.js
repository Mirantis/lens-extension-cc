import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import * as rtv from 'rtvjs';
import { autorun } from 'mobx';
import { ProviderStore } from './ProviderStore';
import { cloneDeepWith } from 'lodash';
import { globalCloudStore } from '../../store/CloudStore';
import { Cloud } from '../../common/Cloud';
import { IpcRenderer } from '../IpcRenderer';
import { ipcEvents } from '../../constants';
import { logger, logValue } from '../../util/logger';

class CloudProviderStore extends ProviderStore {
  // @override
  makeNew() {
    return {
      ...super.makeNew(),
      clouds: {},
    };
  }

  // @override
  validate() {
    DEV_ENV &&
      rtv.verify(
        { 'CloudProvider.store': this.store },
        {
          'CloudProvider.store': {
            // map of cloudUrl -> Cloud instance
            clouds: [
              rtv.HASH_MAP,
              { $values: [rtv.CLASS_OBJECT, { ctor: Cloud }] },
            ],
          },
        }
      );
  }

  // @override
  clone() {
    return cloneDeepWith(this.store, (value, key) => {
      if (key === 'clouds') {
        // instead of letting Lodash dig deep into this object, shallow-clone it
        //  since we don't actively set any properties beneath it's immediate ones
        return { ...value };
      }
    });
  }
}

const pr = new CloudProviderStore();
let mounted = false; // avoid state updates after unmounting

const CloudContext = createContext();

/**
 * @private
 * Mobx `autorun()` handler. Any changes to observable properties accessed in this
 *  method will trigger this same function to run again if they change.
 */
const _handleAutoRun = function () {
  const oldStoreClouds = { ...pr.store.clouds };
  let storeChanged = false;

  // add any new Clouds added to the CloudStore
  Object.entries(globalCloudStore.clouds).forEach(([cloudUrl, cloud]) => {
    if (!pr.store.clouds[cloudUrl]) {
      pr.store.clouds[cloudUrl] = cloud;
      storeChanged = true;
    }
  });

  // filter out updated Clouds
  Object.keys(oldStoreClouds).forEach((cloudUrl) => {
    if (globalCloudStore.clouds[cloudUrl]) {
      // still exists so remove from the old list so we don't destroy it
      // NOTE: the CloudStore is careful to update existing Cloud instances when
      //  they change in the cloud-store.json file, and those updates will cause
      //  CLOUD_EVENTS to fire if appropriate, so any components watching for
      //  events on a single Cloud will have already been notified by now
      delete oldStoreClouds[cloudUrl];
    }
  });

  // destroy any old Clouds removed from the CloudStore
  Object.entries(oldStoreClouds).forEach(([cloudUrl, cloud]) => {
    cloud.destroy(); // CloudStore should already have done this, but just in case (probably noop)
    delete pr.store.clouds[cloudUrl];
    storeChanged = true;
  });

  if (mounted && storeChanged) {
    pr.onChange();
  }
};

/**
 * Called when a Cloud's connection status has changed.
 * @param {string} event
 * @param {string} cloudUrl
 * @param {{ connecting: boolean, connectError: string|null }} status New connection status.
 */
const _handleCloudStatusChange = function (event, cloudUrl, status) {
  if (cloudUrl && pr.store.clouds[cloudUrl]) {
    logger.log(
      'CloudProvider._handleCloudStatusChange()',
      `Received new status=${JSON.stringify(status)} for cloudUrl=${logValue(
        cloudUrl
      )}`
    );
    Object.entries(status).forEach(([key, value]) => {
      pr.store.clouds[cloudUrl][key] = value;
    });
  } else {
    logger.error(
      'CloudProvider._handleCloudStatusChange()',
      `Unable to find Cloud with cloudUrl=${logValue(cloudUrl)}`
    );
  }
};

/**
 * Called when a Cloud's loaded state has changed.
 * @param {string} event
 * @param {string} cloudUrl
 * @param {boolean} loaded New loaded state.
 */
const _handleCloudLoadedChange = function (event, cloudUrl, loaded) {
  if (cloudUrl && pr.store.clouds[cloudUrl]) {
    logger.log(
      'CloudProvider._handleCloudLoadedChange()',
      `Received new loaded=${loaded} state for cloudUrl=${logValue(cloudUrl)}`
    );
    pr.store.clouds[cloudUrl].loaded = loaded;
  } else {
    logger.error(
      'CloudProvider._handleCloudLoadedChange()',
      `Unable to find Cloud with cloudUrl=${logValue(cloudUrl)}`
    );
  }
};

/**
 * Called when a Cloud's fetching state has changed.
 * @param {string} event
 * @param {string} cloudUrl
 * @param {boolean} fetching New fetching state.
 */
const _handleCloudFetchingChange = function (event, cloudUrl, fetching) {
  if (cloudUrl && pr.store.clouds[cloudUrl]) {
    logger.log(
      'CloudProvider._handleCloudFetchingChange()',
      `Received new fetching=${fetching} state for cloudUrl=${logValue(
        cloudUrl
      )}`
    );
    pr.store.clouds[cloudUrl].fetching = fetching;
  } else {
    logger.error(
      'CloudProvider._handleCloudFetchingChange()',
      `Unable to find Cloud with cloudUrl=${logValue(cloudUrl)}`
    );
  }
};

export const useClouds = function () {
  const context = useContext(CloudContext);
  if (!context) {
    throw new Error('useClouds must be used within an CloudProvider');
  }

  // NOTE: `context` is the value of the `value` prop we set on the
  //  <CloudContext.Provider value={...}/> we return as the <CloudProvider/>
  //  component to wrap all children that should have access to the state (i.e.
  //  all the children that will be able to `useClouds()` to access the state)
  // NOTE: `state` is ALWAYS a clone of the CloudProviderStore so it's safe to return
  const [state] = context;

  return {
    clouds: state.clouds,

    actions: {
      /**
       * Adds a new Cloud to the store.
       * @param {Cloud} cloud
       */
      addCloud(cloud) {
        globalCloudStore.addCloud(cloud);
      },

      /**
       * Removes a Cloud from the store.
       * @param {string} cloudUrl URL of the Cloud to remove.
       */
      removeCloud(cloudUrl) {
        globalCloudStore.removeCloud(cloudUrl);
      },
    },
  };
};

/**
 * @private
 * @type {boolean} True if the CloudProvider has rendered at least once
 */
let _initialized = false;

/**
 * Provides Clouds from the CloudStore as an indirection. Currently, this is primarily
 *  to prevent proliferation of Mobx throughout the rest of the UI. Not a fan of Mobx
 *  and how it messes with the data structures it observes.
 *
 * It also provides an __indirection__ should we need to provide a different type of object
 *  that's based on a Cloud. We can insulate the app from sometimes overzealous Mobx updates
 *  and reduce churn. And we also give ourselves a way to get Clouds from a source other than
 *  the CloudStore if necessary (e.g. we might get Clouds over IPC, sent from something
 *  on the MAIN thread).
 */
export const CloudProvider = function (props) {
  if (!_initialized) {
    IpcRenderer.getInstance().listen(
      ipcEvents.broadcast.CLOUD_STATUS_CHANGE,
      _handleCloudStatusChange
    );
    IpcRenderer.getInstance().listen(
      ipcEvents.broadcast.CLOUD_LOADED_CHANGE,
      _handleCloudLoadedChange
    );
    IpcRenderer.getInstance().listen(
      ipcEvents.broadcast.CLOUD_FETCHING_CHANGE,
      _handleCloudFetchingChange
    );
    _initialized = true;
  }

  // NOTE: since the state is passed directly (by reference) into the context
  //  returned by the provider, even the initial state should be a clone of the
  //  `store` so that we consistently return a `state` property (in the context)
  //  that is a shallow clone of the `store`
  const [state, setState] = useState(pr.clone());
  const value = useMemo(() => [state, setState], [state]);

  pr.setState = setState;
  mounted = true;

  // @see https://mobx.js.org/reactions.html#autorun
  // NOTE: I have no idea why, but using a reaction() like we do in the SyncStore
  //  on MAIN (which works fine there) is DOA here on RENDERER: the reaction is
  //  never called except on first-run; only autorun() works
  autorun(_handleAutoRun);

  useEffect(function () {
    return () => {
      mounted = false;
    };
  }, []);

  return <CloudContext.Provider value={value} {...props} />;
};
