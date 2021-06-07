import pkg from '../package.json';

/** Lens Catalog-related constants. */
export const catalog = Object.freeze({
  /**
   * Name of the boolean label added to all clusters added to the Lens Catalog by this
   *  extension, e.g. "mcc=true".
   */
  source: pkg.name,

  /** Label names. */
  labels: Object.freeze({
    /** Label identifying the cluster as coming from an MCC instance. */
    source: 'mcc',
    /** Label identifying the cluster's namespace. It's called a "project" in MCC UI. */
    namespace: 'project',
  }),

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
