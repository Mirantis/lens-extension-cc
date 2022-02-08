import * as rtv from 'rtvjs';
import { Cluster } from './Cluster';

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

    let _clusters = null;
    let _sshKeys = null;
    let _credentials = null;

    /** @member {string} */
    this.id = data.metadata.uid;

    /** @member {string} */
    this.name = data.metadata.name;

    /** @member {boolean} */
    this.deleteInProgress = !!data.metadata.deletionTimestamp; // 'Active', 'Terminating', others?

    /** @member {string} */
    this.phase = data.status.phase;

    /**
     * @member {Array<Cluster>|null} clusters Clusters in this namespace. `null` if unknown.
     *  Empty if none.
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
          _clusters = newValue || null;
        }
      },
    });

    /**
     * @member {Array<Object>|null} sshKeys SSH keys in this namespace. `null` if unknown.
     *  Empty if none.
     */
    Object.defineProperty(this, 'sshKeys', {
      enumerable: true,
      get() {
        return _sshKeys;
      },
      set(newValue) {
        // TODO: update the shape to check for an SshKey class instance
        rtv.verify(
          { sshKeys: newValue },
          { sshKeys: [rtv.EXPECTED, rtv.ARRAY, { $: [rtv.OBJECT] }] }
        );
        if (newValue !== _sshKeys) {
          _sshKeys = newValue || null;
        }
      },
    });

    /**
     * @member {Array<Object>|null} credentials Credentials in this namespace. `null` if unknown.
     *  Empty if none.
     */
    Object.defineProperty(this, 'credentials', {
      enumerable: true,
      get() {
        return _credentials;
      },
      set(newValue) {
        // TODO: update the shape to check for an Credential class instance
        rtv.verify(
          { credentials: newValue },
          {
            credentials: [
              rtv.EXPECTED,
              {
                awscredential: [[rtv.OBJECT]],
                byocredential: [[rtv.OBJECT]],
                openstackcredential: [[rtv.OBJECT]],
              },
            ],
          }
        );
        if (newValue !== _credentials) {
          _credentials = newValue || null;
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
