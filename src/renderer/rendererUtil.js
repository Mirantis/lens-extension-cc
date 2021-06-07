//
// Renderer-specific utilities
//

import { Renderer } from '@k8slens/extensions';
import * as consts from '../constants';

const { Catalog } = Renderer;

/**
 * @returns {Array<Common.Catalog.KubernetesCluster>} List of clusters in the
 *  Lens Catalog.
 */
export const getLensClusters = function () {
  return Catalog.catalogEntities.getItemsForApiKind(
    consts.catalog.entities.kubeCluster.versions.v1alpha1,
    consts.catalog.entities.kubeCluster.kind
  );
};
