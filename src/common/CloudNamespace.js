import * as rtv from 'rtvjs';
import { logValue } from '../util/logger';
import { Namespace } from '../api/types/Namespace';

/**
 * @type {Object} RTV Typeset (shape) for a namespace in a Cloud. This is meant to
 *  be a subset of the Namespace class interface, which represents a "preview" Namespace
 *  that only has counts and a name, not full resource lists (which we don't care about).
 */
export const cloudNamespaceTs = {
  name: rtv.STRING,
  clusterCount: [rtv.SAFE_INT, { min: 0 }],
  machineCount: [rtv.SAFE_INT, { min: 0 }],
  sshKeyCount: [rtv.SAFE_INT, { min: 0 }],
  credentialCount: [rtv.SAFE_INT, { min: 0 }],
  proxyCount: [rtv.SAFE_INT, { min: 0 }],
  licenseCount: [rtv.SAFE_INT, { min: 0 }],

  // CAREFUL: API resource `Namespace` class doesn't have this so leave optional
  //  (falsy === ignored/not synced)
  synced: [rtv.OPTIONAL, rtv.BOOLEAN],
};

/**
 * MCC namespace info (not a Namespace API resource).
 * @class CloudNamespace
 */
export class CloudNamespace {
  /**
   * @constructor
   * @param {Object} params
   * @param {string} params.cloudUrl URL of the Cloud to which this namespace belongs.
   * @param {Namespace|CloudNamespace|Object|string} [params.name] Either a Namespace resource,
   *  a CloudNamespace, an object that satisfies the `cloudNamespaceTs` shape, or a namespace
   *  __name__. If a Namespace, CloudNamespace, or object, then all properties are initialized
   *  according to it. If a string, then just the `name` is initialized.
   * @param {boolean} [params.synced] True if this namespace will be synced. If left `undefined`,
   *  and `name` is a CloudNamespace or object with a `synced` property, then it will be used.
   *  Otherwise, `false` will be assumed.
   */
  constructor({ cloudUrl, name: nameOrNs, synced: isSynced }) {
    DEV_ENV &&
      rtv.verify(
        { cloudUrl, name: nameOrNs },
        {
          cloudUrl: rtv.STRING,
          name: [
            rtv.STRING,
            rtv.CLASS_OBJECT,
            { ctor: Namespace },
            rtv.CLASS_OBJECT,
            { ctor: CloudNamespace },
            rtv.OBJECT,
            { $: cloudNamespaceTs },
          ],
        }
      );

    let _name = null;
    let _synced = false;
    let _clusterCount = 0;
    let _machineCount = 0;
    let _sshKeyCount = 0;
    let _credentialCount = 0;
    let _proxyCount = 0;
    let _licenseCount = 0;

    /**
     * @readonly
     * @member {string} cloudUrl
     */
    Object.defineProperty(this, 'cloudUrl', {
      enumerable: true,
      get() {
        return cloudUrl;
      },
    });

    /**
     * @readonly
     * @member {string} name
     */
    Object.defineProperty(this, 'name', {
      enumerable: true,
      get() {
        return _name;
      },
    });

    /** @member {boolean} synced True if this namespace is synced by its Cloud. */
    Object.defineProperty(this, 'synced', {
      enumerable: true,
      get() {
        return _synced;
      },
      set(newValue) {
        if (_synced !== !!newValue) {
          _synced = !!newValue;
          if (!_synced) {
            this.resetCounts();
          }
        }
      },
    });

    /**
     * @member {number} clusterCount Number of clusters in this namespace.
     */
    Object.defineProperty(this, 'clusterCount', {
      enumerable: true,
      get() {
        return _clusterCount;
      },
      set(newValue) {
        DEV_ENV &&
          rtv.verify(
            { clusterCount: newValue },
            { clusterCount: [rtv.SAFE_INT, { min: 0 }] }
          );

        if (_clusterCount !== newValue) {
          _clusterCount = Math.max(newValue, 0);
        }
      },
    });

    /**
     * @member {number} machineCount Number of machines in this namespace.
     */
    Object.defineProperty(this, 'machineCount', {
      enumerable: true,
      get() {
        return _machineCount;
      },
      set(newValue) {
        DEV_ENV &&
          rtv.verify(
            { machineCount: newValue },
            { machineCount: [rtv.SAFE_INT, { min: 0 }] }
          );

        if (_machineCount !== newValue) {
          _machineCount = Math.max(newValue, 0);
        }
      },
    });

    /**
     * @member {number} clusterCount Number of SSH keys in this namespace.
     */
    Object.defineProperty(this, 'sshKeyCount', {
      enumerable: true,
      get() {
        return _sshKeyCount;
      },
      set(newValue) {
        DEV_ENV &&
          rtv.verify(
            { sshKeyCount: newValue },
            { sshKeyCount: [rtv.SAFE_INT, { min: 0 }] }
          );

        if (_sshKeyCount !== newValue) {
          _sshKeyCount = Math.max(newValue, 0);
        }
      },
    });

    /**
     * @member {number} credentialCount Number of all credentials, regardless of type, in this namespace.
     */
    Object.defineProperty(this, 'credentialCount', {
      enumerable: true,
      get() {
        return _credentialCount;
      },
      set(newValue) {
        DEV_ENV &&
          rtv.verify(
            { credentialCount: newValue },
            { credentialCount: [rtv.SAFE_INT, { min: 0 }] }
          );

        if (_credentialCount !== newValue) {
          _credentialCount = Math.max(newValue, 0);
        }
      },
    });

    /**
     * @member {number} proxyCount Number of all proxies in this namespace.
     */
    Object.defineProperty(this, 'proxyCount', {
      enumerable: true,
      get() {
        return _proxyCount;
      },
      set(newValue) {
        DEV_ENV &&
          rtv.verify(
            { proxyCount: newValue },
            { proxyCount: [rtv.SAFE_INT, { min: 0 }] }
          );

        if (_proxyCount !== newValue) {
          _proxyCount = Math.max(newValue, 0);
        }
      },
    });

    /**
     * @member {number} licenseCount Number of all licenses in this namespace.
     */
    Object.defineProperty(this, 'licenseCount', {
      enumerable: true,
      get() {
        return _licenseCount;
      },
      set(newValue) {
        DEV_ENV &&
          rtv.verify(
            { licenseCount: newValue },
            { licenseCount: [rtv.SAFE_INT, { min: 0 }] }
          );

        if (_licenseCount !== newValue) {
          _licenseCount = Math.max(newValue, 0);
        }
      },
    });

    //// Initialize

    if (
      nameOrNs instanceof Namespace ||
      nameOrNs instanceof CloudNamespace ||
      (nameOrNs && typeof nameOrNs === 'object')
    ) {
      // all these possibilities satisfy the `cloudNamespaceTs` shape
      Object.keys(cloudNamespaceTs)
        .filter((key) => key !== 'synced' && key !== 'name')
        .forEach((key) => (this[key] = nameOrNs[key]));

      _name = nameOrNs.name; // `this.name` is read-only so assign internally

      if (typeof isSynced === 'boolean' || nameOrNs instanceof Namespace) {
        // either the parameter was explicitly specified and overrides whatever `nameOrNs` has; or
        //  it's a Namespace which doesn't have the `synced` property, so we have to use the
        //  parameter
        this.synced = !!isSynced;
      } else if (
        nameOrNs instanceof CloudNamespace ||
        typeof nameOrNs === 'object'
      ) {
        // must match `cloudNamespaceTs` shape and have `synced` property
        this.synced = nameOrNs.synced;
      }
    } else {
      if (nameOrNs) {
        _name = nameOrNs;
      }

      this.synced = !!isSynced;
    }
  }

  /** Resets all counts to zero. */
  resetCounts() {
    this.clusterCount = 0;
    this.machineCount = 0;
    this.sshKeyCount = 0;
    this.credentialCount = 0;
    this.proxyCount = 0;
    this.licenseCount = 0;
  }

  /** @returns {Object} JSON representation of this instance. */
  toJSON() {
    return Object.keys(cloudNamespaceTs).reduce((json, key) => {
      json[key] = this[key];
      return json;
    }, {});
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `name: ${logValue(this.name)}, synced: ${
      this.synced
    }, clusters: ${this.clusterCount}, credentials: ${
      this.credentialCount
    }, sshKeys: ${this.sshKeyCount}, machines: ${this.machineCount}, proxies: ${
      this.proxyCount
    }, licenses: ${this.licenseCount}`;

    return `{CloudNamespace ${propStr}}`;
  }
}
