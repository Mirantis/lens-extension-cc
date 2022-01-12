//
// Extension State Management (stores in Local Storage)
//

import { createContext, useContext, useState, useMemo } from 'react';
import propTypes from 'prop-types';
import * as rtv from 'rtvjs';
import { cloneDeep, cloneDeepWith } from 'lodash';
import { PreferenceStore, prefStore } from '../../store/PreferenceStore';
import { Cloud } from '../../common/Cloud';
import { ProviderStore } from './ProviderStore';
import ExtensionRenderer from '../renderer';

const extStateTs = {
  prefs: [rtv.EXPECTED, rtv.CLASS_OBJECT, { ctor: PreferenceStore }],
  cloud: [rtv.EXPECTED, rtv.CLASS_OBJECT, { ctor: Cloud }],
};

let extension; // {ExtensionRenderer} instance reference
let extFileFolderLoading = false; // true if we're waiting for the file folder to load async

//
// Store
//

class ExtStateProviderStore extends ProviderStore {
  constructor() {
    super();
    prefStore.addUpdateHandler(this.onStoreUpdate.bind(this));
  }

  // @override
  makeNew() {
    const newStore = {
      ...super.makeNew(),
      prefs: prefStore, // singleton instance
      cloud: new Cloud(),
    };

    newStore.cloud.username = prefStore.username || null;
    newStore.loaded = true; // always

    return newStore;
  }

  // @override
  reset() {
    this.store.prefs.reset();
    super.reset();
  }

  // @override
  clone() {
    return cloneDeepWith(this.store, (value, key) => {
      if (key === 'cloud') {
        // instead of letting Lodash dig deep into this object, clone it manually
        return new Cloud(cloneDeep(value.toJSON()));
      } else if (key === 'prefs') {
        return value; // it's a singleton instance so just return the instance
      }
      // else, let Lodash do the cloning
    });
  }

  // @override
  validate() {
    const result = rtv.check({ state: this.store }, { state: extStateTs });

    if (!result.valid) {
      throw new Error(
        `[ExtStateProvider] Invalid extension state, error="${result.message}"`
      );
    }
  }

  // called whenever the pref store is updated from disk
  onStoreUpdate() {
    this.store.cloud.username = this.store.prefs.username;
  }
}

const pr = new ExtStateProviderStore();

//
// Internal Methods
//

//
// Provider Definition
//

const ExtStateContext = createContext();

export const useExtState = function () {
  const context = useContext(ExtStateContext);
  if (!context) {
    throw new Error('useExtState must be used within an ExtStateProvider');
  }

  // NOTE: `context` is the value of the `value` prop we set on the
  //  <ExtStateContext.Provider value={...}/> we return as the <ExtStateProvider/>
  //  component to wrap all children that should have access to the state (i.e.
  //  all the children that will be able to `useExtState()` to access the state)
  const [state] = context;

  // this is what you actually get from `useExtState()` when you consume it
  return {
    state,

    //// ACTIONS

    actions: {
      /** Reset the state, forgetting all data. */
      reset() {
        pr.reset();
      },

      /**
       * Sets a new Cloud object into the store, which implicitely updates
       *  the `username` in the store based on `newValue.username`.
       * @param {Cloud|null} newValue
       */
      setCloud(newValue) {
        pr.store.cloud = newValue;
        pr.store.prefs.username = newValue ? newValue.username : null;

        if (pr.store.cloud) {
          // mark it as no longer being changed if it was
          pr.store.cloud.changed = false;
        }

        pr.onChange();
      },

      /**
       * Updates the MCC base URL.
       * @param {string} newValue Must not end with a slash.
       */
      setCloudUrl(newValue) {
        pr.store.prefs.cloudUrl = newValue;
        pr.onChange();
      },

      /**
       * Updates the save path where kubeConfig files should be saved on the local system.
       * @param {string} newValue Must not end with a slash.
       */
      setSavePath(newValue) {
        pr.store.prefs.savePath = newValue;
        pr.onChange();
      },

      /**
       * Updates the offline option when generating cluster access tokens.
       * @param {boolean} newValue
       */
      setOffline(newValue) {
        pr.store.prefs.offline = newValue;
        pr.onChange();
      },
    },
  };
};

export const ExtStateProvider = function ({
  extension: lensExtension,
  ...props
}) {
  extension = lensExtension;

  // attempt to load the special data directory path that Lens consistently assigns
  //  to this extension on every load (should always be the same one as long as the
  //  extension remains installed)
  if (!PreferenceStore.defaultSavePath && !extFileFolderLoading) {
    extFileFolderLoading = true;
    extension
      .getExtensionFileFolder()
      .then((folder) => {
        PreferenceStore.defaultSavePath = folder;
      })
      .catch(() => {
        // use the extension's installation directory as a fallback, though
        //  this is not safe because if the extension is uninstalled, this
        //  directory is removed by Lens, and would result in any Kubeconfig
        //  files also being deleted, and therefore clusters lost in Lens
        PreferenceStore.defaultSavePath = __dirname;
      })
      .finally(() => {
        extFileFolderLoading = false;

        // only use default if we didn't get a path when we loaded the pref store
        if (!pr.store.prefs.savePath) {
          pr.store.prefs.savePath = PreferenceStore.defaultSavePath;
          pr.onChange();
        }
      });
  }

  // NOTE: since the state is passed directly (by reference) into the context
  //  returned by the provider, even the initial state should be a clone of the
  //  `store` so that we consistently return a `state` property (in the context)
  //  that is a shallow clone of the `store`
  const [state, setState] = useState(pr.clone());
  const value = useMemo(() => [state, setState], [state]);

  pr.setState = setState;

  return <ExtStateContext.Provider value={value} {...props} />;
};

ExtStateProvider.propTypes = {
  extension: propTypes.instanceOf(ExtensionRenderer).isRequired,
};
