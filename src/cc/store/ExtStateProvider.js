//
// Extension State Management (stores in Local Storage)
//

import React, { createContext, useContext, useState, useMemo } from 'react';
import rtv from 'rtvjs';
import { cloneDeep, cloneDeepWith } from 'lodash';
import { AuthState } from '../auth/AuthState';

const STORAGE_KEY = 'lens-mcc-ext';

const extStateTs = {
  baseUrl: [rtv.EXPECTED, rtv.STRING, (v) => {
    if (v && v.match(/\/$/)) {
      throw new Error('baseUrl must not end with a slash');
    }
  }], // MCC UI URL, does NOT end with a slash
  authState: [rtv.EXPECTED, rtv.CLASS_OBJECT, { ctor: AuthState }],
};

let stateLoaded = false; // {boolean} true if the state has been loaded from storage

//
// Store
//

// the store defines the initial state and contains the current state
const store = {
  baseUrl: null,
  authState: new AuthState(),
};

//
// Internal Methods
//

/**
 * Creates a full clone of the `store`.
 * @returns {Object} Cloned store object.
 */
const _cloneStore = function () {
  return cloneDeepWith(store, (value, key) => {
    if (key === 'authState') {
      // instead of letting Lodash dig deep into this object, clone it manually
      return new AuthState(cloneDeep(value.toJSON()));
    }
    // else, let Lodash do the cloning
  });
};

/**
 * Validates the specified state.
 * @param {ExtState} state State to validate.
 * @throws {Error} if the state is invalid.
 */
const _validateState = function (state) {
  const result = rtv.check({ state }, { state: extStateTs });

  if (!result.valid) {
    throw new Error(`Invalid extension state, error="${result.message}"`);
  }
};

/**
 * Saves the specified ExtState to storage.
 * @param {ExtState} state State to store.
 */
const _saveState = function (state) {
  _validateState(state);

  // TODO: encrypt this payload...
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

/**
 * Initializes the store with app state from storage, if it exists.
 */
const _loadState = function () {
  // DEBUG TODO: decrypt this payload...
  const jsonStr = window.localStorage.getItem(STORAGE_KEY);

  let useInitialState = false;

  if (jsonStr) {
    try {
      const json = JSON.parse(jsonStr);
      const fromStorage = {
        ...json,
        authState: new AuthState(json.authState)
      };

      _validateState(fromStorage); // validate what we get
      Object.assign(store, fromStorage); // put it into the store
    } catch (err) {
      useInitialState = true;
    }
  } else {
    useInitialState = true;
  }

  if (useInitialState) {
    _validateState(store); // validate we're starting with something good
  }
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
  _saveState(store);
  _triggerContextUpdate(setState);
};

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
  const [state, setState] = context;

  // this is what you actually get from `useExtState()` when you consume it
  return {
    state,

    //// ACTIONS

    actions: {
      /** Reset the state, forgetting all data. */
      reset() {
        let changed = false;

        Object.keys(store).forEach((key) => {
          changed = changed || store[key] !== null;
          store[key] = null;
        });

        if (changed) {
          _onStateChanged(setState);
        }
      },

      /**
       * Sets a new AuthState object into the store.
       * @param {AuthState|null} newAuthState
       */
      setAuthState(newAuthState) {
        store.authState = newAuthState;
        if (store.authState) {
          // mark it as no longer being changed if it was
          store.authState.changed = false;
        }
        _onStateChanged(setState);
      },

      /**
       * Updates the MCC base URL.
       * @param {string} newBaseUrl Must not end with a slash.
       */
      setBaseUrl(newBaseUrl) {
        store.baseUrl = newBaseUrl;
        _onStateChanged(setState);
      },
    },
  };
};

export const ExtStateProvider = function (props) {
  // load state from storage only once
  if (!stateLoaded) {
    _loadState();
    stateLoaded = true;
  }

  // NOTE: since the state is passed directly (by reference) into the context
  //  returned by the provider, even the initial state should be a clone of the
  //  `store` so that we consistently return a `state` property (in the context)
  //  that is a shallow clone of the `store`
  const [state, setState] = useState(_cloneStore());
  const value = useMemo(() => [state, setState], [state]);

  return <ExtStateContext.Provider value={value} {...props} />;
};
