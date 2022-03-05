import { deepFreeze } from './util/deepFreeze';

export const mccPascalName = 'Mcc'; // PascalCase, for prefixing with other names
export const mccCodeName = mccPascalName.toUpperCase();
export const mccShortName = 'Container Cloud';
export const mccFullName = `Mirantis ${mccShortName}`;

const mccEntityGroup = `entity.${mccCodeName}.dev`.toLowerCase();
const lensCatalogGroup = 'catalog.k8slens.dev';
const lensEntityGroup = 'entity.k8slens.dev';
const v1alpha1 = 'v1alpha1';

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
    /** Signature: (event: string, level: string, context: string, message: string, ...args: Array) => void */
    LOGGER: 'logger',
  },

  /** Invoked on the `main` process only. Returns a promise to be awaited. */
  invoke: {
    /** Signature: (event: string, cloudUrl: string) => void */
    SYNC_NOW: 'syncNow',
  },
});

/** Welcome Page */
export const repository = deepFreeze({
  readmeUrl:
    'https://github.com/Mirantis/lens-extension-cc/blob/master/README.md',
});
