import * as rtv from 'rtvjs';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { ApiObject, apiObjectTs } from './ApiObject';
import { Cluster } from './Cluster';
import { Credential } from './Credential';
import { SshKey } from './SshKey';
import { Proxy } from './Proxy';
import { License } from './License';

/**
 * Typeset for an MCC Namespace object.
 */
export const apiNamespaceTs = mergeRtvShapes({}, apiObjectTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Credential` class instance

  status: {
    phase: rtv.STRING,
  },
});
delete apiNamespaceTs.kind; // Namespace API objects don't have `kind` property for some reason

/**
 * MCC project/namespace.
 * @class Namespace
 * @param {Object} data Raw namespace data payload from the API.
 */
export class Namespace extends ApiObject {
  constructor({ data, cloud }) {
    super({ data, cloud, typeset: apiNamespaceTs });

    let _clusters = [];
    let _sshKeys = [];
    let _credentials = [];
    let _proxies = [];
    let _licenses = [];

    /** @member {string} */
    Object.defineProperty(this, 'phase', {
      enumerable: true,
      get() {
        return data.status.phase;
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
     * @member{ Array<SshKey>} sshKeys SSH keys in this namespace. Empty if none.
     */
    Object.defineProperty(this, 'sshKeys', {
      enumerable: true,
      get() {
        return _sshKeys;
      },
      set(newValue) {
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
  }

  /**
   * @member {number} clusterCount Number of clusters in this namespace.
   */
  get clusterCount() {
    return this.clusters.length;
  }

  /**
   * @member {number} clusterCount Number of SSH keys in this namespace.
   */
  get sshKeyCount() {
    return this.sshKeys.length;
  }

  /**
   * @member {number} credentialCount Number of all credentials, doesn't matter type, in this namespace.
   */
  get credentialCount() {
    return this.credentials.length;
  }

  /**
   * @member {number} proxyCount Number of all proxies in this namespace.
   */
  get proxyCount() {
    return this.proxies.length;
  }

  /**
   * @member {number} licenseCount Number of all licenses in this namespace.
   */
  get licenseCount() {
    return this.licenses.length;
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, clusters: ${
      this.clusterCount
    }, sshKeys: ${this.sshKeyCount}, credentials: ${
      this.credentialCount
    }, proxies: ${this.proxyCount}, licenses: ${this.licenseCount}`;

    if (Object.getPrototypeOf(this).constructor === Namespace) {
      return `{Namespace ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
