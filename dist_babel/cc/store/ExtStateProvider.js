"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ExtStateProvider = exports.useExtState = void 0;

var _cloneDeepWith2 = _interopRequireDefault(require("lodash/cloneDeepWith"));

var _cloneDeep2 = _interopRequireDefault(require("lodash/cloneDeep"));

var _react = require("react");

var _propTypes = _interopRequireDefault(require("prop-types"));

var rtv = _interopRequireWildcard(require("rtvjs"));

var _PreferencesStore = require("./PreferencesStore");

var _AuthAccess = require("../auth/AuthAccess");

var _ProviderStore = require("./ProviderStore");

var _jsxRuntime = require("@emotion/react/jsx-runtime");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//
// Extension State Management (stores in Local Storage)
//
const extStateTs = {
  prefs: [rtv.EXPECTED, rtv.CLASS_OBJECT, {
    ctor: _PreferencesStore.PreferencesStore
  }],
  authAccess: [rtv.EXPECTED, rtv.CLASS_OBJECT, {
    ctor: _AuthAccess.AuthAccess
  }]
};
let extension; // {LensErendererExtension} instance reference

let extFileFolderLoading = false; // true if we're waiting for the file folder to load async
//
// Store
//

class ExtStateProviderStore extends _ProviderStore.ProviderStore {
  constructor() {
    super();

    _PreferencesStore.prefStore.addUpdateHandler(this.onStoreUpdate.bind(this));
  } // @override


  makeNew() {
    const newStore = { ...super.makeNew(),
      prefs: _PreferencesStore.prefStore,
      // singleton instance
      authAccess: new _AuthAccess.AuthAccess()
    };
    newStore.authAccess.username = _PreferencesStore.prefStore.username || null;
    newStore.loaded = true; // always

    return newStore;
  } // @override


  reset() {
    this.store.prefs.reset();
    super.reset();
  } // @override


  clone() {
    return (0, _cloneDeepWith2.default)(this.store, (value, key) => {
      if (key === 'authAccess') {
        // instead of letting Lodash dig deep into this object, clone it manually
        return new _AuthAccess.AuthAccess((0, _cloneDeep2.default)(value.toJSON()));
      } else if (key === 'prefs') {
        return value; // it's a singleton instance so just return the instance
      } // else, let Lodash do the cloning

    });
  } // @override


  validate() {
    const result = rtv.check({
      state: this.store
    }, {
      state: extStateTs
    });

    if (!result.valid) {
      throw new Error(`[ExtStateProvider] Invalid extension state, error="${result.message}"`);
    }
  } // called whenever the pref store is updated from disk


  onStoreUpdate() {
    this.store.authAccess.username = this.store.prefs.username;
  }

}

const pr = new ExtStateProviderStore(); //
// Internal Methods
//
//
// Provider Definition
//

const ExtStateContext = /*#__PURE__*/(0, _react.createContext)();

const useExtState = function () {
  const context = (0, _react.useContext)(ExtStateContext);

  if (!context) {
    throw new Error('useExtState must be used within an ExtStateProvider');
  } // NOTE: `context` is the value of the `value` prop we set on the
  //  <ExtStateContext.Provider value={...}/> we return as the <ExtStateProvider/>
  //  component to wrap all children that should have access to the state (i.e.
  //  all the children that will be able to `useExtState()` to access the state)


  const [state] = context; // this is what you actually get from `useExtState()` when you consume it

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
      }

    }
  };
};

exports.useExtState = useExtState;

const ExtStateProvider = function ({
  extension: lensExtension,
  ...props
}) {
  extension = lensExtension; // attempt to load the special data directory path that Lens consistently assigns
  //  to this extension on every load (should always be the same one as long as the
  //  extension remains installed)

  if (!_PreferencesStore.PreferencesStore.defaultSavePath && !extFileFolderLoading) {
    extFileFolderLoading = true;
    extension.getExtensionFileFolder().then(folder => {
      _PreferencesStore.PreferencesStore.defaultSavePath = folder;
    }).catch(() => {
      // use the extension's installation directory as a fallback, though
      //  this is not safe because if the extension is uninstalled, this
      //  directory is removed by Lens, and would result in any Kubeconfig
      //  files also being deleted, and therefore clusters lost in Lens
      _PreferencesStore.PreferencesStore.defaultSavePath = __dirname;
    }).finally(() => {
      extFileFolderLoading = false; // only use default if we didn't get a path when we loaded the pref store

      if (!pr.store.prefs.savePath) {
        pr.store.prefs.savePath = _PreferencesStore.PreferencesStore.defaultSavePath;
        pr.onChange();
      }
    });
  } // NOTE: since the state is passed directly (by reference) into the context
  //  returned by the provider, even the initial state should be a clone of the
  //  `store` so that we consistently return a `state` property (in the context)
  //  that is a shallow clone of the `store`


  const [state, setState] = (0, _react.useState)(pr.clone());
  const value = (0, _react.useMemo)(() => [state, setState], [state]);
  pr.setState = setState;
  return (0, _jsxRuntime.jsx)(ExtStateContext.Provider, {
    value: value,
    ...props
  });
};

exports.ExtStateProvider = ExtStateProvider;
ExtStateProvider.propTypes = {
  extension: _propTypes.default.object.isRequired
};