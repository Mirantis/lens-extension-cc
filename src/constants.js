import pkg from '../package.json';
import { deepFreeze } from './util/deepFreeze';

const extEntityGroup = 'entity.mcc.dev';

/** Catalog-related constants. */
export const catalog = deepFreeze({
  /**
   * Source for the catalog entity; identifies _what_ added the entity to the Catalog,
   *  or where it came from. Searching the Catalog will include the entity's source
   *  as search content.
   */
  source: pkg.name,

  /** Label names. */
  labels: {
    /** Label identifying the cluster as coming from an MCC instance. */
    source: 'mcc',
    /** Label identifying the cluster's namespace. It's called a "project" in MCC UI. */
    namespace: 'project',
  },

  /** Lens built-in generic Catalog category type and versions. */
  category: {
    kind: 'CatalogCategory',
    group: 'catalog.k8slens.dev',
    versions: {
      v1alpha1: 'v1alpha1',
    },
  },

  /** Lens entities (built-in and custom). */
  entities: {
    /** `Common.Catalog.KubernetesCluster` (built-in) */
    kubeCluster: {
      kind: 'KubernetesCluster',
      group: 'entity.k8slens.dev',
      versions: {
        v1alpha1: 'v1alpha1',
      },
    },
    /** MCC SSH Key (custom) */
    sshKey: {
      kind: 'SSHKey',
      group: extEntityGroup,
      versions: {
        v1alpha1: 'v1alpha1',
      },
    },
    /** MCC Credential (custom) */
    credential: {
      kind: 'Credential',
      group: extEntityGroup,
      versions: {
        v1alpha1: 'v1alpha1',
      },
    },
    /** MCC Proxy (custom) */
    proxy: {
      kind: 'Proxy',
      group: extEntityGroup,
      versions: {
        v1alpha1: 'v1alpha1',
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
    /** Signature: (event: string, clusterIds: Array<string>) => void */
    CLUSTERS_ADDED: 'clustersAdded',
    /** Signature: (event: string, clusterIds: Array<string>) => void */
    CLUSTERS_REMOVED: 'clustersRemoved',
  },

  /** Invoked on the `main` process only. Returns a promise to be awaited. */
  invoke: {
    /** Signature: (event: string, models: Array<ClusterModel>) => void */
    ADD_CLUSTERS: 'addClusters',
    /** Signature: (event: string, clusterId: string) => void */
    REMOVE_CLUSTER: 'removeCluster',
    /** Signature: (event: string, clusterId: string) => void */
    DELETE_CLUSTER: 'deleteCluster',
  },
});

/** Welcome Page */
export const welcomePage = deepFreeze({
  /** And more! button */
  andMoreButton: {
    url: 'https://github.com/Mirantis/lens-extension-cc/blob/master/README.md',
    target: '_blank',
  },
});
