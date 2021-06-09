import pkg from '../package.json';
import { deepFreeze } from './util/deepFreeze';

/** Lens Catalog-related constants. */
export const catalog = deepFreeze({
  /**
   * Name of the boolean label added to all clusters added to the Lens Catalog by this
   *  extension, e.g. "mcc=true".
   */
  source: pkg.name,

  /** Label names. */
  labels: {
    /** Label identifying the cluster as coming from an MCC instance. */
    source: 'mcc',
    /** Label identifying the cluster's namespace. It's called a "project" in MCC UI. */
    namespace: 'project',
  },

  /** Lens entities (built-in). */
  entities: {
    /** `Common.Catalog.KubernetesCluster` */
    kubeCluster: {
      /** Entity type (there may be multiple versions in the future; see `versions`). */
      kind: 'KubernetesCluster',
      /** Generic group (could be clusters of any version). */
      group: 'entity.k8slens.dev',
      /** API versions of KubernetesCluster object kinds. */
      versions: {
        v1alpha1: 'entity.k8slens.dev/v1alpha1', // Common.Catalog.KubernetesCluster class
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
