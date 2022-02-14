import * as rtv from 'rtvjs';
import { Cluster } from './Cluster';
import { Credential } from './Credential';
import { SshKey } from './SshKey';
import { Proxy } from './Proxy';
import { License } from './License';

/**
 * MCC project/namespace.
 * @class Namespace
 * @param {Object} data Raw namespace data payload from the API.
 */
export class Namespace {
  constructor(data) {
    DEV_ENV &&
      rtv.verify(
        { data },
        {
          data: {
            metadata: {
              uid: rtv.STRING,
              name: rtv.STRING,
              creationTimestamp: rtv.STRING, // ISO8601 timestamp
              deletionTimestamp: [rtv.OPTIONAL, rtv.STRING], // ISO8601 timestamp; only exists if being deleted
            },
            status: {
              phase: rtv.STRING,
            },
          },
        }
      );

    let _clusters = [];
    let _sshKeys = [];
    let _credentials = [];
    let _proxies = [];
    let _licenses = [];

    /** @member {string} */
    this.id = data.metadata.uid;

    /** @member {string} */
    this.name = data.metadata.name;

    /** @member {boolean} */
    this.deleteInProgress = !!data.metadata.deletionTimestamp; // 'Active', 'Terminating', others?

    /** @member {string} */
    this.phase = data.status.phase;

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
          { sshKeys: [rtv.EXPECTED, rtv.ARRAY, { ctor: SshKey }] }
        );
        if (newValue !== _sshKeys) {
          _sshKeys = newValue || [];
        }
      },
    });

    /**
     * @member {Array<Credential>} credentials Credentials in this namespace. Empty if none.
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
              {
                awscredential: [rtv.EXPECTED, rtv.ARRAY, { ctor: Credential }],
                byocredential: [rtv.EXPECTED, rtv.ARRAY, { ctor: Credential }],
                openstackcredential: [
                  rtv.EXPECTED,
                  rtv.ARRAY,
                  { ctor: Credential },
                ],
              },
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
        if (newValue !== _proxies) {
          _licenses = newValue || [];
        }
      },
    });
  }

  /**
   * @member {number} clusterCount Number of clusters in this namespace.
   */
  get clusterCount() {
    return this.clusters?.length || 0;
  }

  /**
   * @member {number} clusterCount Number of SSH keys in this namespace.
   */
  get sshKeyCount() {
    return this.sshKeys?.length || 0;
  }
}
