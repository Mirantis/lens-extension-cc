//
// Provides the MCC server's Configuration object
//

import React, { createContext, useContext, useState, useMemo } from 'react';
import { request } from '../netUtil';

//
// Store
//

/** @returns {Object} A new store object in its initial state. */
const _mkNewStore = function () {
  return {
    loading: false, // {boolean} true if data is being loaded
    loaded: false, // {boolean} true if data has been loaded (regardless of error)
    error: undefined, // {string} if a load error occurred; undefined otherwise
    config: null, // {Object} MCC server Configuration object; null if not loaded
  };
};

// The store defines the initial state and contains the current state
const store = {
  ..._mkNewStore()
};

//
// Internal Methods
//

/**
 * Creates a full clone of the `store`.
 * @returns {Object} Cloned store object.
 */
const _cloneStore = function () {
  // since we don't support updates on properties deep into the config object,
  //  a shallow clone is sufficient
  return { ...store };
};

/**
 * Forces an update to this context's state.
 * @param {function} setState Function to call to update the context's state.
 */
const _triggerContextUpdate = function (setState) {
  // NOTE: by deep-cloning the store, React will detect changes to the root object,
  //  as well as to any nested objects, triggering a render regardless of whether a
  //  component is depending on the root, or on one of its children
  setState(_cloneStore());
};

/**
 * Called when a state property has changed.
 * @param {function} setState Function to call to update the context's state.
 */
const _onStateChanged = function (setState) {
  _triggerContextUpdate(setState);
};

/**
 * Resets store state. Data will need to be reloaded.
 * @param {function} setState Function to call to update the context's state.
 * @param {boolean} [loading] True if resetting because data is loading; false if
 *  just resetting to initial state.
 */
const _reset = function (setState, loading = false) {
  Object.assign(store, _mkNewStore()); // replace all properties with totally new ones
  store.loading = loading;
  _onStateChanged(setState);
};

/**
 * [ASYNC] Gets the config JSON object at the specified MCC URL.
 * @param {string} url URL to MCC. Must NOT end with a slash.
 * @param {function} setState Function to call to update the context's state.
 */
const _loadConfig = async function getConfig(url, setState) {
  _reset(setState, true);

  const res = await request(`${url}/config.js`, {}, { extractBodyMethod: 'text' });

  store.loading = false;
  store.loaded = true;

  if (res.error) {
    store.error = res.error;
  } else {
    const content = res.body.replace(/^window\.CONFIG\s*=\s*{/, '{').replace('};', '}');

    try {
      store.config = JSON.parse(content);
    } catch (err) {
      store.error = err.message;
    }
  }

  _onStateChanged(setState);
};

//
// Provider Definition
//

const ConfigContext = createContext();

export const useConfig = function () {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within an ConfigProvider');
  }

  // NOTE: `context` is the value of the `value` prop we set on the
  //  <ConfigContext.Provider value={...}/> we return as the <ConfigProvider/>
  //  component to wrap all children that should have access to the state (i.e.
  //  all the children that will be able to `useConfig()` to access the state)
  const [state, setState] = context;

  // this is what you actually get from `useConfig()` when you consume it
  return {
    state,

    //// ACTIONS

    actions: {
      /**
       * [ASYNC] Loads the MCC Configuration object.
       * @param {string} url MCC URL. Must NOT end with a slash.
       */
      load(url) {
        if (!store.loading) {
          _loadConfig(url, setState);
        }
      },

      /** Resets store state. Data will need to be reloaded. */
      reset() {
        if (!store.loading) {
          _reset(setState);
        }
      },
    },
  };
};

export const ConfigProvider = function (props) {
  // NOTE: since the state is passed directly (by reference) into the context
  //  returned by the provider, even the initial state should be a clone of the
  //  `store` so that we consistently return a `state` property (in the context)
  //  that is a shallow clone of the `store`
  const [state, setState] = useState(_cloneStore());
  const value = useMemo(() => [state, setState], [state]);

  return <ConfigContext.Provider value={value} {...props} />;
};
