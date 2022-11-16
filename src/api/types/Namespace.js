import * as rtv from 'rtvjs';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { Resource, resourceTs } from './Resource';
import { Cluster } from './Cluster';
import { ResourceEvent } from './ResourceEvent';
import { ResourceUpdate } from './ResourceUpdate';
import { Machine } from './Machine';
import { Credential } from './Credential';
import { SshKey } from './SshKey';
import { Proxy } from './Proxy';
import { License } from './License';
import { logger, logValue } from '../../util/logger';

/**
 * Typeset for an MCC Namespace object.
 */
export const namespaceTs = mergeRtvShapes({}, resourceTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Namespace` class instance

  status: {
    phase: rtv.STRING,
  },
});
delete namespaceTs.kind; // Namespace API objects don't have `kind` property for some reason

/**
 * MCC namespace API resource.
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
  constructor({ data, cloud, preview = false }) {
    super({ data, cloud, typeset: namespaceTs });

    let _clusters = [];
    let _events = [];
    let _updates = [];
    let _machines = [];
    let _sshKeys = [];
    let _credentials = [];
    let _proxies = [];
    let _licenses = [];

    // initially `undefined` to defer to length of associated array when NOT preview;
    //  when IS preview, initially `0` so we do NOT defer to length of associated
    //  array since we shouldn't be accessing the array in preview mode
    // NOTE: we don't need `_eventCount` in preview mode, so we just need the array
    let _clusterCount = preview ? 0 : undefined;
    let _machineCount = preview ? 0 : undefined;
    let _sshKeyCount = preview ? 0 : undefined;
    let _credentialCount = preview ? 0 : undefined;
    let _proxyCount = preview ? 0 : undefined;
    let _licenseCount = preview ? 0 : undefined;

    /** @member {string} phase */
    Object.defineProperty(this, 'phase', {
      enumerable: true,
      get() {
        return data.status.phase;
      },
    });

    /** @member {boolean} preview */
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
        if (this.preview) {
          logger.warn(
            'Namespace.clusters:get',
            `Getting always-empty clusters property on PREVIEW namespace=${logValue(
              this.name
            )}`
          );
        }

        return _clusters;
      },
      set(newValue) {
        if (this.preview) {
          throw new Error(
            `Cannot set clusters property on PREVIEW namespace=${logValue(
              this.name
            )}`
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
     * @member {Array<ResourceEvent>} events Resource events in this namespace. Empty if none.
     */
    Object.defineProperty(this, 'events', {
      enumerable: true,
      get() {
        if (this.preview) {
          logger.warn(
            'Namespace.events:get',
            `Getting always-empty events property on PREVIEW namespace=${logValue(
              this.name
            )}`
          );
        }

        return _events;
      },
      set(newValue) {
        if (this.preview) {
          throw new Error(
            `Cannot set events property on PREVIEW namespace=${logValue(
              this.name
            )}`
          );
        }

        DEV_ENV &&
          rtv.verify(
            { events: newValue },
            {
              events: [
                rtv.EXPECTED,
                rtv.ARRAY,
                {
                  $: [
                    // NOTE: For some mysterious reason, using the simpler
                    //  `rtv.CLASS_OBJECT, { ctor: ResourceEvent }` typeset, like we use
                    //  for all other Namespace properties here, does not work with an
                    //  array of ClusterEvent instances. Somehow, RTV even rejects
                    //  `rtv.OBJECT` (which is used internally in the `rtv.CLASS_OBJECT`
                    //  validation, hence the failure) so this custom validator does
                    //  what we want without blowing up for no good reason that I can
                    //  see so far
                    (v) => {
                      if (!(v instanceof ResourceEvent)) {
                        throw new Error(
                          'Namespace events must be ResourceEvent instances'
                        );
                      }
                    },
                  ],
                },
              ],
            }
          );

        if (newValue !== _events) {
          _events = newValue || [];
        }
      },
    });

    /**
     * @member {Array<ResourceUpdate>} updates Resource updates in this namespace. Empty if none.
     */
    Object.defineProperty(this, 'updates', {
      enumerable: true,
      get() {
        if (this.preview) {
          logger.warn(
            'Namespace.updates:get',
            `Getting always-empty updates property on PREVIEW namespace=${logValue(
              this.name
            )}`
          );
        }

        return _updates;
      },
      set(newValue) {
        if (this.preview) {
          throw new Error(
            `Cannot set updates property on PREVIEW namespace=${logValue(
              this.name
            )}`
          );
        }

        DEV_ENV &&
          rtv.verify(
            { updates: newValue },
            {
              updates: [
                rtv.EXPECTED,
                rtv.ARRAY,
                {
                  $: [
                    // NOTE: For some mysterious reason, using the simpler
                    //  `rtv.CLASS_OBJECT, { ctor: ResourceUpdate }` typeset, like we use
                    //  for all other Namespace properties here, does not work with an
                    //  array of ClusterEvent instances. Somehow, RTV even rejects
                    //  `rtv.OBJECT` (which is used internally in the `rtv.CLASS_OBJECT`
                    //  validation, hence the failure) so this custom validator does
                    //  what we want without blowing up for no good reason that I can
                    //  see so far
                    (v) => {
                      if (!(v instanceof ResourceUpdate)) {
                        throw new Error(
                          'Namespace updates must be ResourceUpdate instances'
                        );
                      }
                    },
                  ],
                },
              ],
            }
          );

        if (newValue !== _updates) {
          _updates = newValue || [];
        }
      },
    });

    /**
     * @member {Array<Machine>} machines Machines in this namespace. Empty if none.
     */
    Object.defineProperty(this, 'machines', {
      enumerable: true,
      get() {
        if (this.preview) {
          logger.warn(
            'Namespace.machines:get',
            `Getting always-empty machines property on PREVIEW namespace=${logValue(
              this.name
            )}`
          );
        }

        return _machines;
      },
      set(newValue) {
        if (this.preview) {
          throw new Error(
            `Cannot set machines property on PREVIEW namespace=${logValue(
              this.name
            )}`
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
        if (this.preview) {
          logger.warn(
            'Namespace.sshKeys:get',
            `Getting always-empty sshKeys property on PREVIEW namespace=${logValue(
              this.name
            )}`
          );
        }

        return _sshKeys;
      },
      set(newValue) {
        if (this.preview) {
          throw new Error(
            `Cannot set sshKeys property on PREVIEW namespace=${logValue(
              this.name
            )}`
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
        if (this.preview) {
          logger.warn(
            'Namespace.credentials:get',
            `Getting always-empty credentials property on PREVIEW namespace=${logValue(
              this.name
            )}`
          );
        }

        return _credentials;
      },
      set(newValue) {
        if (this.preview) {
          throw new Error(
            `Cannot set credentials property on PREVIEW namespace=${logValue(
              this.name
            )}`
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
        if (this.preview) {
          logger.warn(
            'Namespace.proxies:get',
            `Getting always-empty proxies property on PREVIEW namespace=${logValue(
              this.name
            )}`
          );
        }

        return _proxies;
      },
      set(newValue) {
        if (this.preview) {
          throw new Error(
            `Cannot set proxies property on PREVIEW namespace=${logValue(
              this.name
            )}`
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
        if (this.preview) {
          logger.warn(
            'Namespace.licenses:get',
            `Getting always-empty licenses property on PREVIEW namespace=${logValue(
              this.name
            )}`
          );
        }

        return _licenses;
      },
      set(newValue) {
        if (this.preview) {
          throw new Error(
            `Cannot set licenses property on PREVIEW namespace=${logValue(
              this.name
            )}`
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
            `Cannot set clusterCount property on non-preview namespace=${logValue(
              this.name
            )}`
          );
        }

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
            `Cannot set machineCount property on non-preview namespace=${logValue(
              this.name
            )}`
          );
        }

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
            `Cannot set sshKeyCount property on non-preview namespace=${logValue(
              this.name
            )}`
          );
        }

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
            `Cannot set credentialCount property on non-preview namespace=${logValue(
              this.name
            )}`
          );
        }

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
            `Cannot set proxyCount property on non-preview namespace=${logValue(
              this.name
            )}`
          );
        }

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
            `Cannot set licenseCount property on non-preview namespace=${logValue(
              this.name
            )}`
          );
        }

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
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    // NOTE: AVOID using list properties unless you test for `this.preview === true`
    const propStr = `${super.toString()}, preview: ${this.preview}, clusters: ${
      this.clusterCount
    }, events: ${this.events.length}, updates: ${
      this.updates.length
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
