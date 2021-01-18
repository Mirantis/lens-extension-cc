//
// Extension State Management (stores in Local Storage)
//

import React, { createContext, useContext, useState, useMemo } from 'react';
import propTypes from 'prop-types';
import * as rtv from 'rtvjs';
import { cloneDeep, cloneDeepWith } from 'lodash';
import { PreferencesStore } from './PreferencesStore';
import { AuthAccess } from '../auth/AuthAccess';
import { ProviderStore } from './ProviderStore';

const extStateTs = {
  prefs: [rtv.EXPECTED, rtv.CLASS_OBJECT, { ctor: PreferencesStore }],
  authAccess: [rtv.EXPECTED, rtv.CLASS_OBJECT, { ctor: AuthAccess }],
};

let extension; // {LensErendererExtension} instance reference
let extFileFolderLoading = false; // true if we're waiting for the file folder to load async

//
// Store
//

class ExtStateProviderStore extends ProviderStore {
  // @override
  makeNew() {
    const newStore = {
      ...super.makeNew(),
      prefs: PreferencesStore.getInstance(), // singleton instance
      authAccess: new AuthAccess(),
    };

    newStore.loaded = true; // always

    return newStore;
  }

  // @override
  reset() {
    super.reset();
    this.store.prefs.reset();
  }

  // @override
  clone() {
    return cloneDeepWith(this.store, (value, key) => {
      if (key === 'authAccess') {
        // instead of letting Lodash dig deep into this object, clone it manually
        return new AuthAccess(cloneDeep(value.toJSON()));
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
       * Sets a new AuthAccess object into the store.
       * @param {AuthAccess|null} newValue
       */
      setAuthAccess(newValue) {
        pr.store.authAccess = newValue;
        pr.store.prefs.username = newValue ? newValue.username : null;

        if (pr.store.authAccess) {
          // mark it as no longer being changed if it was
          pr.store.authAccess.changed = false;
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

      /**
       * Updates the 'add to new' option when adding clusters.
       * @param {boolean} newValue
       */
      setAddToNew(newValue) {
        pr.store.prefs.addToNew = newValue;
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
  if (!PreferencesStore.defaultSavePath && !extFileFolderLoading) {
    extFileFolderLoading = true;
    extension
      .getExtensionFileFolder()
      .then((folder) => {
        PreferencesStore.defaultSavePath = folder;
      })
      .catch(() => {
        // use the extension's installation directory as a fallback, though
        //  this is not safe because if the extension is uninstalled, this
        //  directory is removed by Lens, and would result in any Kubeconfig
        //  files also being deleted, and therefore clusters lost in Lens
        PreferencesStore.defaultSavePath = __dirname;
      })
      .finally(() => {
        extFileFolderLoading = false;

        // only use default if we didn't get a path when we loaded the pref store
        if (!pr.store.prefs.savePath) {
          pr.store.prefs.savePath = PreferencesStore.defaultSavePath;
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
  extension: propTypes.object.isRequired,
};
