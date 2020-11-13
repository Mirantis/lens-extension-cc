//
// Extension State Management (stores in Local Storage)
//

import React, { createContext, useContext, useState, useMemo } from 'react';
import rtv from 'rtvjs';
import { cloneDeep, cloneDeepWith } from 'lodash';
import { AuthAccess } from '../auth/AuthAccess';
import { ProviderStore } from './ProviderStore';
import pkg from '../../../package.json';

const STORAGE_KEY = 'lens-mcc-ext';

const extStateTs = {
  baseUrl: [
    rtv.EXPECTED,
    rtv.STRING,
    (v) => {
      if (v && v.match(/\/$/)) {
        throw new Error('baseUrl must not end with a slash');
      }
    },
  ], // MCC UI URL, does NOT end with a slash
  username: [rtv.EXPECTED, rtv.STRING],
  authAccess: [rtv.EXPECTED, rtv.CLASS_OBJECT, { ctor: AuthAccess }],
  savePath: [rtv.EXPECTED, rtv.STRING], // absolute path on local system where to save kubeconfig files
  offline: [rtv.EXPECTED, rtv.BOOLEAN], // if kubeconfigs should use offline tokens
  addToNew: [rtv.EXPECTED, rtv.BOOLEAN], // if workspaces should be created to match cluster namespaces
};

let storeLoaded = false; // {boolean} true if the store has been loaded from storage

//
// Store
//

class ExtStateProviderStore extends ProviderStore {
  // @override
  makeNew() {
    const newStore = {
      ...super.makeNew(),
      baseUrl: null,
      username: null,
      authAccess: new AuthAccess(),
      savePath: __dirname, // extension's `./dist` directory by default
      offline: true,
      addToNew: true,
    };

    // remove super properties that aren't applicable
    delete newStore.loading;
    delete newStore.loaded;
    delete newStore.error;

    return newStore;
  }

  // @override
  clone() {
    return cloneDeepWith(this.store, (value, key) => {
      if (key === 'authAccess') {
        // instead of letting Lodash dig deep into this object, clone it manually
        return new AuthAccess(cloneDeep(value.toJSON()));
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

  // @override
  onChange() {
    super.onChange(); // will validate
    this.save();
  }

  /**
   * Initializes the store from local storage, if it exists.
   */
  load() {
    const jsonStr = window.localStorage.getItem(STORAGE_KEY);

    let useInitialState = false;

    if (jsonStr) {
      try {
        const json = JSON.parse(jsonStr);
        const fromStorage = {
          ...json,
          authAccess: new AuthAccess(),
        };

        Object.assign(this.store, fromStorage); // put it into the store
        this.validate();

        this.store.authAccess.username = this.store.username;
      } catch (err) {
        console.error(
          `[${pkg.name}/ExtStateProviderStore.load()] ERROR: ${err.message}`,
          err
        );
        useInitialState = true;
      }
    } else {
      useInitialState = true;
    }

    if (useInitialState) {
      this.validate(); // validate we're starting with something good
    }
  }

  /**
   * Saves the specified ExtState to storage.
   */
  save() {
    // TODO: consider using https://atom.github.io/node-keytar/ to store all credentials
    //  in the local keychain to restore after restarting Lens
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...this.store,
        authAccess: undefined, // don't store any credentials (except for `store.username`)
      })
    );
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
        pr.store.username = newValue ? newValue.username : null;

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
      setBaseUrl(newValue) {
        pr.store.baseUrl = newValue;
        pr.onChange();
      },

      /**
       * Updates the save path where kubeconfig files should be saved on the local system.
       * @param {string} newValue Must not end with a slash.
       */
      setSavePath(newValue) {
        pr.store.savePath = newValue;
        pr.onChange();
      },

      /**
       * Updates the offline option when generating cluster access tokens.
       * @param {boolean} newValue
       */
      setOffline(newValue) {
        pr.store.offline = newValue;
        pr.onChange();
      },

      /**
       * Updates the 'add to new' option when adding clusters.
       * @param {boolean} newValue
       */
      setAddToNew(newValue) {
        pr.store.addToNew = newValue;
        pr.onChange();
      },
    },
  };
};

export const ExtStateProvider = function (props) {
  // load state from storage only once
  if (!storeLoaded) {
    pr.load();
    storeLoaded = true;
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
