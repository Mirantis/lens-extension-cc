//
// Renderer-specific utilities
//

import { Renderer } from '@k8slens/extensions';
import dayjs from 'dayjs';
import dayjsRelativeTimePlugin from 'dayjs/plugin/relativeTime';
import * as consts from '../constants';

dayjs.extend(dayjsRelativeTimePlugin);

const { Catalog } = Renderer;

/**
 * @returns {Array<Common.Catalog.KubernetesCluster>} List of clusters in the
 *  Lens Catalog.
 */
export const getLensClusters = function () {
  return Catalog.catalogEntities.getItemsForApiKind(
    `${consts.catalog.entities.kubeCluster.group}/${consts.catalog.entities.kubeCluster.versions.v1alpha1}`,
    consts.catalog.entities.kubeCluster.kind
  );
};

/**
 * Convert ISO 8601 to formatted date.
 * @param {Date|string} date Date to format.
 * @returns {string|undefined} If a date is given, then formatted. If falsy, or the date is the epoch, undefined.
 */
export const formatDate = (date) => {
  if (!date) {
    return undefined;
  }

  const dateObj = new Date(date);
  return dateObj.getTime() === 0
    ? undefined
    : `${dayjs(date).fromNow(true)} ago (${dayjs(date).format(
        'YYYY-MM-DD, HH:mm:ss'
      )})`;
};
