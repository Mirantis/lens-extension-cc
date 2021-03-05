"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.prefStore = exports.PreferencesStore = exports.preferencesTs = void 0;

var _mobx = require("mobx");

var _extensions = require("@k8slens/extensions");

var rtv = _interopRequireWildcard(require("rtvjs"));

var _class, _descriptor, _descriptor2, _descriptor3, _descriptor4, _descriptor5, _class2, _temp;

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _initializerDefineProperty(target, property, descriptor, context) { if (!descriptor) return; Object.defineProperty(target, property, { enumerable: descriptor.enumerable, configurable: descriptor.configurable, writable: descriptor.writable, value: descriptor.initializer ? descriptor.initializer.call(context) : void 0 }); }

function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'proposal-class-properties is enabled and runs after the decorators transform.'); }

/** RTV.js typeset for preferences model. */
const preferencesTs = {
  /** MCC instance URL, does NOT end with a slash. */
  cloudUrl: [rtv.EXPECTED, rtv.STRING, v => {
    if (v && v.match(/\/$/)) {
      throw new Error('cloudUrl must not end with a slash');
    }
  }],

  /** Username used for authentication purposes to the MCC instance. */
  username: [rtv.EXPECTED, rtv.STRING],

  /** Absolute path where kubeconfigs are to be saved. */
  savePath: [rtv.EXPECTED, rtv.STRING],

  /**
   * If true, the refresh token generated for the clusters will be enabled for
   *  offline access. WARNING: This is less secure than a normal refresh token as
   *  it will never expire.
   */
  offline: [rtv.EXPECTED, rtv.BOOLEAN],

  /**
   * If true, the clusters will be added to new (or existing if the workspaces already
   *  exist) workspaces that correlate to their original MCC namespaces; otherwise,
   *  they will all be added to the active workspace.
   */
  addToNew: [rtv.EXPECTED, rtv.BOOLEAN]
};
/** Preferences auto-persisted by Lens. Singleton. Use `getInstance()` static method. */

exports.preferencesTs = preferencesTs;
let PreferencesStore = (_class = (_temp = _class2 = class PreferencesStore extends _extensions.Store.ExtensionStore {
  // NOTE: See renderer.tsx#onActivate() where this.loadExtension() is called on
  //  the store instance in order to get Lens to load it from storage.
  // ultimately, we try to set this to the getExtensionFileFolder() directory that
  //  Lens gives the extension, but we don't know what it is until later
  static getDefaults() {
    return {
      cloudUrl: null,
      username: null,
      savePath: PreferencesStore.defaultSavePath,
      offline: true,
      addToNew: true
    };
  }
  /**
   * List of onUpdate handlers to be called whenever this store gets updated from disk.
   * @type {Array<Function>}
   */


  constructor() {
    super({
      configName: 'preferences-store',
      defaults: PreferencesStore.getDefaults()
    });
    this.updateHandlers = [];

    _initializerDefineProperty(this, "cloudUrl", _descriptor, this);

    _initializerDefineProperty(this, "username", _descriptor2, this);

    _initializerDefineProperty(this, "savePath", _descriptor3, this);

    _initializerDefineProperty(this, "offline", _descriptor4, this);

    _initializerDefineProperty(this, "addToNew", _descriptor5, this);
  }
  /** Reset all preferences to their default values. */


  reset() {
    const defaults = PreferencesStore.getDefaults();
    Object.keys(this).forEach(key => this[key] = defaults[key]);
  }

  fromStore(store) {
    const result = rtv.check({
      store
    }, {
      store: preferencesTs
    });

    if (!result.valid) {
      // eslint-disable-next-line no-console -- log error
      console.error(`[PreferencesStore] Invalid preferences found, error="${result.message}"`);
      return;
    }

    Object.keys(store).forEach(key => this[key] = store[key]); // call any onUpdate() handlers

    this.updateHandlers.forEach(h => h());
  }

  toJSON() {
    // throw-away: just to get keys we care about on this
    const defaults = PreferencesStore.getDefaults();
    const observableThis = Object.keys(defaults).reduce((obj, key) => {
      obj[key] = this[key];
      return obj;
    }, {}); // return a deep-clone that is no longer observable

    return (0, _mobx.toJS)(observableThis, {
      recurseEverything: true
    });
  }
  /**
   * Adds an onUpdate() handler if it hasn't already been added. This handler
   *  will be called whenever this store is updated from disk.
   * @param {Function} handler
   */


  addUpdateHandler(handler) {
    if (!this.updateHandlers.find(h => h === handler)) {
      this.updateHandlers.push(handler);
    }
  }
  /**
   * Removes an onUpdate() handler if it's currently in the list.
   * @param {Function} handler
   */


  removeUpdateHandler(handler) {
    const idx = this.updateHandlers.findIndex(h => h === handler);

    if (idx >= 0) {
      this.updateHandlers.splice(idx, 1);
    }
  }

}, _class2.defaultSavePath = null, _temp), (_descriptor = _applyDecoratedDescriptor(_class.prototype, "cloudUrl", [_mobx.observable], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _descriptor2 = _applyDecoratedDescriptor(_class.prototype, "username", [_mobx.observable], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _descriptor3 = _applyDecoratedDescriptor(_class.prototype, "savePath", [_mobx.observable], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _descriptor4 = _applyDecoratedDescriptor(_class.prototype, "offline", [_mobx.observable], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _descriptor5 = _applyDecoratedDescriptor(_class.prototype, "addToNew", [_mobx.observable], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
})), _class); // singleton instance, for convenience

exports.PreferencesStore = PreferencesStore;
const prefStore = PreferencesStore.getInstance();
exports.prefStore = prefStore;