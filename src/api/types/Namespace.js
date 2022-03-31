import * as rtv from 'rtvjs';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { Resource, resourceTs } from './Resource';
import { Cluster } from './Cluster';
import { Machine } from './Machine';
import { Credential } from './Credential';
import { SshKey } from './SshKey';
import { Proxy } from './Proxy';
import { License } from './License';

/**
 * Typeset for an MCC Namespace object.
 */
export const namespaceTs = mergeRtvShapes({}, resourceTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Credential` class instance

  status: {
    phase: rtv.STRING,
  },
});
delete namespaceTs.kind; // Namespace API objects don't have `kind` property for some reason

/**
 * MCC project/namespace.
 * @class Namespace
 */
export class Namespace extends Resource {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.data Raw data payload from the API.
   * @param {Cloud} params.cloud Reference to the Cloud used to get the data.
   * @param {boolean} [params.preview] True if this Namespace is for preview
   *  purposes only, and so only the __count__ properties will be valid.
   */
  constructor({ data, cloud, preview }) {
    super({ data, cloud, typeset: namespaceTs });

    let _clusters = [];
    let _clusterCount;
    let _machines = [];
    let _machineCount;
    let _sshKeys = [];
    let _sshKeyCount;
    let _credentials = [];
    let _credentialCount;
    let _proxies = [];
    let _proxyCount;
    let _licenses = [];
    let _licenseCount;

    /** @member {string} */
    Object.defineProperty(this, 'phase', {
      enumerable: true,
      get() {
        return data.status.phase;
      },
    });

    /** @member {boolean} */
    Object.defineProperty(this, 'preview', {
      enumerable: true,
      get() {
        return !!preview;
      },
    });

    /**
     * @member {Array<Cluster>} clusters Clusters in this namespace. Empty if none.
     */
    Object.defineProperty(this, 'clusters', {
      enumerable: true,
      get() {
        return _clusters;
      },
      set(newValue) {
        if (this.preview) {
          throw new Error(
            `Cannot set set clusters property on preview namespace=${this}`
          );
        }

        DEV_ENV &&
          rtv.verify(
            { clusters: newValue },
            {
              clusters: [
                rtv.EXPECTED,
                rtv.ARRAY,
                { $: [rtv.CLASS_OBJECT, { ctor: Cluster }] },
              ],
            }
          );

        if (newValue !== _clusters) {
          _clusters = newValue || [];
        }
      },
    });

    /**
     * @member {Array<Machine>} machines Machines in this namespace. Empty if none.
     */
    Object.defineProperty(this, 'machines', {
      enumerable: true,
      get() {
        return _machines;
      },
      set(newValue) {
        if (this.preview) {
          throw new Error(
            `Cannot set set machines property on preview namespace=${this}`
          );
        }

        DEV_ENV &&
          rtv.verify(
            { machines: newValue },
            {
              machines: [
                rtv.EXPECTED,
                rtv.ARRAY,
                { $: [rtv.CLASS_OBJECT, { ctor: Machine }] },
              ],
            }
          );

        if (newValue !== _machines) {
          _machines = newValue || [];
        }
      },
    });

    /**
     * @member{ Array<SshKey>} sshKeys SSH keys in this namespace. Empty if none.
     */
    Object.defineProperty(this, 'sshKeys', {
      enumerable: true,
      get() {
        return _sshKeys;
      },
      set(newValue) {
        if (this.preview) {
          throw new Error(
            `Cannot set set sshKeys property on preview namespace=${this}`
          );
        }

        DEV_ENV &&
          rtv.verify(
            { sshKeys: newValue },
            {
              sshKeys: [
                rtv.EXPECTED,
                rtv.ARRAY,
                { $: [rtv.CLASS_OBJECT, { ctor: SshKey }] },
              ],
            }
          );

        if (newValue !== _sshKeys) {
          _sshKeys = newValue || [];
        }
      },
    });

    /**
     * @param {Array<Credential>} credentials Credentials in this namespace. Empty if none.
     */
    Object.defineProperty(this, 'credentials', {
      enumerable: true,
      get() {
        return _credentials;
      },
      set(newValue) {
        if (this.preview) {
          throw new Error(
            `Cannot set set credentials property on preview namespace=${this}`
          );
        }

        DEV_ENV &&
          rtv.verify(
            { credentials: newValue },
            {
              credentials: [
                rtv.EXPECTED,
                rtv.ARRAY,
                { $: [rtv.CLASS_OBJECT, { ctor: Credential }] },
              ],
            }
          );

        if (newValue !== _credentials) {
          _credentials = newValue || [];
        }
      },
    });

    /**
     * @member {Array<Proxy>} proxies Proxies in this namespace. Empty if none.
     */
    Object.defineProperty(this, 'proxies', {
      enumerable: true,
      get() {
        return _proxies;
      },
      set(newValue) {
        if (this.preview) {
          throw new Error(
            `Cannot set set proxies property on preview namespace=${this}`
          );
        }

        DEV_ENV &&
          rtv.verify(
            { proxies: newValue },
            {
              proxies: [
                rtv.EXPECTED,
                rtv.ARRAY,
                { $: [rtv.CLASS_OBJECT, { ctor: Proxy }] },
              ],
            }
          );

        if (newValue !== _proxies) {
          _proxies = newValue || [];
        }
      },
    });

    /**
     * @member {Array<License>} licenses License in this namespace. Empty if none.
     */
    Object.defineProperty(this, 'licenses', {
      enumerable: true,
      get() {
        return _licenses;
      },
      set(newValue) {
        if (this.preview) {
          throw new Error(
            `Cannot set set licenses property on preview namespace=${this}`
          );
        }

        DEV_ENV &&
          rtv.verify(
            { licenses: newValue },
            {
              licenses: [
                rtv.EXPECTED,
                rtv.ARRAY,
                { $: [rtv.CLASS_OBJECT, { ctor: License }] },
              ],
            }
          );

        if (newValue !== _licenses) {
          _licenses = newValue || [];
        }
      },
    });

    /**
     * @member {number} clusterCount Number of clusters in this namespace.
     * @throws {Error} If setting this property when `preview` is false.
     */
    Object.defineProperty(this, 'clusterCount', {
      enumerable: true,
      get() {
        return _clusterCount ?? this.clusters.length;
      },
      set(newValue) {
        if (!this.preview) {
          throw new Error(
            `Cannot set clusterCount property on non-preview namespace=${this}`
          );
        }

        DEV_ENV &&
          rtv.verify(
            { clusterCount: newValue },
            { clusterCount: [rtv.OPTIONAL, rtv.SAFE_INT] }
          );

        if (_clusterCount !== newValue) {
          _clusterCount = newValue ?? undefined;
        }
      },
    });

    /**
     * @member {number} machineCount Number of machines in this namespace.
     * @throws {Error} If setting this property when `preview` is false.
     */
    Object.defineProperty(this, 'machineCount', {
      enumerable: true,
      get() {
        return _machineCount ?? this.machines.length;
      },
      set(newValue) {
        if (!this.preview) {
          throw new Error(
            `Cannot set machineCount property on non-preview namespace=${this}`
          );
        }

        DEV_ENV &&
          rtv.verify(
            { machineCount: newValue },
            { machineCount: [rtv.OPTIONAL, rtv.SAFE_INT] }
          );

        if (_machineCount !== newValue) {
          _machineCount = newValue ?? undefined;
        }
      },
    });

    /**
     * @member {number} clusterCount Number of SSH keys in this namespace.
     * @throws {Error} If setting this property when `preview` is false.
     */
    Object.defineProperty(this, 'sshKeyCount', {
      enumerable: true,
      get() {
        return _sshKeyCount ?? this.sshKeys.length;
      },
      set(newValue) {
        if (!this.preview) {
          throw new Error(
            `Cannot set sshKeyCount property on non-preview namespace=${this}`
          );
        }

        DEV_ENV &&
          rtv.verify(
            { sshKeyCount: newValue },
            { sshKeyCount: [rtv.OPTIONAL, rtv.SAFE_INT] }
          );

        if (_sshKeyCount !== newValue) {
          _sshKeyCount = newValue ?? undefined;
        }
      },
    });

    /**
     * @member {number} credentialCount Number of all credentials, doesn't matter type, in this namespace.
     * @throws {Error} If setting this property when `preview` is false.
     */
    Object.defineProperty(this, 'credentialCount', {
      enumerable: true,
      get() {
        return _credentialCount ?? this.credentials.length;
      },
      set(newValue) {
        if (!this.preview) {
          throw new Error(
            `Cannot set credentialCount property on non-preview namespace=${this}`
          );
        }

        DEV_ENV &&
          rtv.verify(
            { credentialCount: newValue },
            { credentialCount: [rtv.OPTIONAL, rtv.SAFE_INT] }
          );

        if (_credentialCount !== newValue) {
          _credentialCount = newValue ?? undefined;
        }
      },
    });

    /**
     * @member {number} proxyCount Number of all proxies in this namespace.
     * @throws {Error} If setting this property when `preview` is false.
     */
    Object.defineProperty(this, 'proxyCount', {
      enumerable: true,
      get() {
        return _proxyCount ?? this.proxies.length;
      },
      set(newValue) {
        if (!this.preview) {
          throw new Error(
            `Cannot set proxyCount property on non-preview namespace=${this}`
          );
        }

        DEV_ENV &&
          rtv.verify(
            { proxyCount: newValue },
            { proxyCount: [rtv.OPTIONAL, rtv.SAFE_INT] }
          );

        if (_proxyCount !== newValue) {
          _proxyCount = newValue ?? undefined;
        }
      },
    });

    /**
     * @member {number} licenseCount Number of all licenses in this namespace.
     * @throws {Error} If setting this property when `preview` is false.
     */
    Object.defineProperty(this, 'licenseCount', {
      enumerable: true,
      get() {
        return _licenseCount ?? this.licenses.length;
      },
      set(newValue) {
        if (!this.preview) {
          throw new Error(
            `Cannot set licenseCount property on non-preview namespace=${this}`
          );
        }

        DEV_ENV &&
          rtv.verify(
            { licenseCount: newValue },
            { licenseCount: [rtv.OPTIONAL, rtv.SAFE_INT] }
          );

        if (_licenseCount !== newValue) {
          _licenseCount = newValue ?? undefined;
        }
      },
    });
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, preview: ${this.preview}, clusters: ${
      this.clusterCount
    }, credentials: ${this.credentialCount}, sshKeys: ${
      this.sshKeyCount
    }, machines: ${this.machineCount}, proxies: ${this.proxyCount}, licenses: ${
      this.licenseCount
    }`;

    if (Object.getPrototypeOf(this).constructor === Namespace) {
      return `{Namespace ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
