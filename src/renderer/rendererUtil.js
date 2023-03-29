//
// Renderer-specific utilities
//

import { Renderer } from '@k8slens/extensions';
import dayjs from 'dayjs';
import dayjsRelativeTimePlugin from 'dayjs/plugin/relativeTime';
import { netErrorTypes, getNetErrorType } from '../util/netUtil';
import * as consts from '../constants';
import * as strings from '../strings';

dayjs.extend(dayjsRelativeTimePlugin);

const { Catalog } = Renderer;

// TODO[CCLEX-196]: DEPRECATED, remove for next major
let skipTlsVerifyFlagWarningShown = false;
export const getSkipTlsVerifyFlagWarningShown = function () {
  return skipTlsVerifyFlagWarningShown;
};
export const setSkipTlsVerifyFlagWarningShown = function () {
  skipTlsVerifyFlagWarningShown = true;
};

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
 * @param {boolean} includeRelative Adds the relative part of the date to the result if true.
 * @returns {string|undefined} If a date is given, then formatted. If falsy, or the date is the epoch, undefined.
 */
export const formatDate = (date, includeRelative = true) => {
  if (!date) {
    return undefined;
  }

  const dateObj = new Date(date);
  return dateObj.getTime() === 0
    ? undefined
    : includeRelative
    ? `${dayjs(date).fromNow(true)} ago (${dayjs(date).format(
        'YYYY-MM-DD, HH:mm:ss'
      )})`
    : dayjs(date).format('YYYY-MM-DD, HH:mm:ss');
};

/**
 * Generates a user-friendly connection error message based on a Cloud's status.
 * @param {Cloud} cloud
 * @returns {string|undefined} Error message; `undefined` if the Cloud isn't in an error state.
 */
export const getCloudConnectionError = function (cloud) {
  let message;
  if (cloud.connectError) {
    message = strings.cloudConnectionErrors.connectionError(); // generic error/reconnect message
    const errorType = getNetErrorType(cloud.connectError);
    if (errorType === netErrorTypes.CERT_VERIFICATION) {
      message = strings.cloudConnectionErrors.untrustedCertificate();
    } else if (errorType === netErrorTypes.HOST_NOT_FOUND) {
      message = strings.cloudConnectionErrors.hostNotFound();
    }
  }

  return message;
};
