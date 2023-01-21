import process from 'process';
import { deepFreeze } from './util/deepFreeze';

// NOTE: there seems to be a bug with Webpack in that if we use optional chaining (`?.`)
//  to make this statement more terse, it just removes the `?` instead of (1) leaving
//  it there like it should (and does for the rest of the code everywhere), or (2)
//  transpiling it to what we've explicitly used here to get around this issue
export const skipTlsVerify =
  process.env.LEX_CC_UNSAFE_ALLOW_SELFSIGNED_CERTS &&
  process.env.LEX_CC_UNSAFE_ALLOW_SELFSIGNED_CERTS.match(/^(true|yes|1)$/);

/**
 * Name of the sub directory in the Lens-designated "extension storage" directory
 *  where kubeConfig files are written.
 * @type {string}
 */
export const kubeconfigDirName = 'kubeconfigs';

/**
 * Name of the sub directory in the Lens-designated "extension storage" directory
 *  where `kubelogin` stores cached cluster access tokens.
 */
export const kubeloginCacheDirName = 'kubelogin-cache';

// maximum number of projects (inclusive), at which point the warning icon will appear
//  about potential performance issues
export const projectsCountBeforeWarning = 10;

export const companyName = 'Mirantis';
export const mccPascalName = 'Mcc'; // PascalCase, for prefixing with other names
export const mccCodeName = mccPascalName.toUpperCase();
export const mccShortName = 'Container Cloud';
export const mccFullName = `${companyName} ${mccShortName}`;

export const mkeCodeName = 'MKE';

const mccEntityGroup = `entity.${mccCodeName}.dev`.toLowerCase();
const lensCatalogGroup = 'catalog.k8slens.dev';
const lensEntityGroup = 'entity.k8slens.dev';
const v1alpha1 = 'v1alpha1';
const v1alpha2 = 'v1alpha2';

/** Supported mgmt cluster provider types. */
export const providerTypes = Object.freeze({
  AWS: 'aws',
  AZURE: 'azure',
  BYO: 'byo',
  EQUINIX: 'equinix',
  OPENSTACK: 'openstack',
  VSPHERE: 'vsphere',
});

/** Catalog-related constants. */
export const catalog = deepFreeze({
  /**
   * Source for the catalog entity; identifies _what_ added the entity to the Catalog,
   *  or where it came from. Searching the Catalog will include the entity's source
   *  as search content.
   */
  source: mccFullName.toLowerCase().replace(/\s+/g, '-'),

  /** Lens built-in generic Catalog category type and versions. */
  category: {
    kind: 'CatalogCategory',
    group: lensCatalogGroup,
    versions: {
      v1alpha1,
    },
  },

  /** Lens entities (built-in and custom). */
  entities: {
    /** `Common.Catalog.KubernetesCluster` (built-in) */
    kubeCluster: {
      kind: 'KubernetesCluster',
      group: lensEntityGroup,
      versions: {
        v1alpha1,
      },
    },
    /** MCC SSH Key (custom) */
    sshKey: {
      kind: `${mccPascalName}SshKey`,
      group: mccEntityGroup,
      versions: {
        v1alpha1,
      },
    },
    /** MCC Credential (custom) */
    credential: {
      kind: `${mccPascalName}Credential`,
      group: mccEntityGroup,
      versions: {
        v1alpha1,
        v1alpha2, // Equinix Metal has v1 and v2
      },
    },
    /** MCC Proxy (custom) */
    proxy: {
      kind: `${mccPascalName}Proxy`,
      group: mccEntityGroup,
      versions: {
        v1alpha1,
      },
    },
    /** MCC (RHEL) License (custom) */
    license: {
      kind: `${mccPascalName}RhelLicense`,
      group: mccEntityGroup,
      versions: {
        v1alpha1,
      },
    },
  },
});

/** IPC events */
export const ipcEvents = deepFreeze({
  /** Send to both `main` and `renderer` processes. No response. No awaiting. */
  broadcast: {
    /**
     * Log something in the RENDERER DevTools Console.
     *
     * Signature: `(event: string, level: string, context: string, message: string, ...args: Array) => void`
     */
    LOGGER: 'logger',

    /**
     * A Cloud's connection status has changed.
     *
     * Signature: `(event: string, cloudUrl: string, status: { connecting: boolean, connectError: string|null }) => void`
     *
     * - `status.connecting`: True if the Cloud is currently connecting (i.e. getting config
     *     or tokens).
     * - `status.connectError`: Error message if connection failed; `null` if no errors reported.
     */
    CLOUD_STATUS_CHANGE: 'cloudStatusChange',

    /**
     * A Cloud's loaded state has changed.
     *
     * Signature: `(event: string, cloudUrl: string, loaded: boolean) => void`
     *
     * - `loaded`: New loaded state.
     */
    CLOUD_LOADED_CHANGE: 'cloudLoadedChange',

    /**
     * A Cloud's fetching state has changed.
     *
     * Signature: `(event: string, cloudUrl: string, fetching: boolean) => void`
     *
     * - `fetching`: New fetching state.
     */
    CLOUD_FETCHING_CHANGE: 'cloudFetchingChange',

    /**
     * System power is being suspended.
     *
     * Signature: `(event: string) => void`
     */
    POWER_SUSPEND: 'powerSuspend',

    /**
     * System power has been restored.
     *
     * Signature: `(event: string) => void`
     */
    POWER_RESUME: 'powerResume',

    /**
     * Network connection has dropped.
     *
     * NOTE: This is not 100% reliable because it's not always possible for Electron
     *  to detect when the network is offline. For example, if the app is running in
     *  a VM with its virtual network adapter configured to be "always on", yet the
     *  host's network connection is dropped, the app will appear online when in fact
     *  it's not.
     *
     * Signature: `(event: string) => void`
     */
    NETWORK_OFFLINE: 'networkOffline',

    /**
     * Network connection has been restored.
     *
     * Signature: `(event: string) => void`
     */
    NETWORK_ONLINE: 'networkOnline',
  },

  /** Invoked on the `main` process only. Returns a promise to be awaited. */
  invoke: {
    /**
     * Sync a Cloud immediately.
     *
     * Signature: `(event: string, cloudUrl: string) => void`
     */
    SYNC_NOW: 'syncNow',
    /**
     * Reconnect a Cloud.
     *
     * Signature: `(event: string, cloudUrl: string) => void`
     */
    RECONNECT: 'reconnect',
  },
});

/** Welcome Page */
export const repository = deepFreeze({
  readmeUrl:
    'https://github.com/Mirantis/lens-extension-cc/blob/master/README.md',
});
