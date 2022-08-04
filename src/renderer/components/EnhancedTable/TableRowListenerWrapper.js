import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { CLOUD_EVENTS } from '../../../common/Cloud';
import { EnhancedTableRow } from './EnhancedTableRow';
import { CONNECTION_STATUSES } from '../../../common/Cloud';
import * as strings from '../../../strings';

const colorGreen = {
  color: 'var(--colorSuccess)',
};

const colorYellow = {
  color: 'var(--colorWarning)',
};

const colorGray = {
  color: 'var(--halfGray)',
};

/**
 * Determines the connection status of the Cloud.
 * @param {Cloud} cloud
 * @return {{cloudStatus: string, namespaceStatus: string, styles: Object}}
 *  where `cloudStatus` and `namespaceStatus` are labels, and `styles` is
 *  a style object to apply to the label.
 */
const getStatus = (cloud) => {
  if (cloud.fetching) {
    return {
      cloudStatus: strings.connectionStatuses.cloud.updating(),
      namespaceStatus: strings.connectionStatuses.namespace.connected(),
      styles: colorYellow,
    };
  }

  switch (cloud.status) {
    case CONNECTION_STATUSES.CONNECTED:
      return {
        cloudStatus: strings.connectionStatuses.cloud.connected(),
        namespaceStatus: strings.connectionStatuses.namespace.connected(),
        styles: colorGreen,
      };

    case CONNECTION_STATUSES.CONNECTING:
      return {
        cloudStatus: strings.connectionStatuses.cloud.connecting(),
        // NOTE: namespace is disconnected until Cloud is connected
        namespaceStatus: strings.connectionStatuses.namespace.disconnected(),
        styles: colorYellow,
      };

    case CONNECTION_STATUSES.DISCONNECTED: // fall-through
    default:
      return {
        cloudStatus: strings.connectionStatuses.cloud.disconnected(),
        namespaceStatus: strings.connectionStatuses.namespace.disconnected(),
        styles: colorGray,
      };
  }
};

// We need this level of abstraction mostly for 'key' prop for `EnhancedTableRow`.
// When DC is not yet loaded, we use DC.cloud.syncedProjects in selective
//  mode (we don't know namespaces yet).
// When they come by updateSyncedProjects() listener - we have to fully rerender row
//  component to force useCheckboxes hook to take new dataCloud data without that we
//  have incorrect checkboxes state in Selected Sync view besides - keep useEffect
//  listeners in separate level looks not so bad. Code become more readable.
export const TableRowListenerWrapper = ({ cloud, withCheckboxes, ...rest }) => {
  const cloudNamespaceProp = withCheckboxes ? 'namespaces' : 'syncedNamespaces';

  // @type {Array<CloudNamespace>}
  const [actualNamespaces, setActualNamespaces] = useState(
    [...cloud[cloudNamespaceProp]] // shallow clone so React can detect changes later
  );
  const [status, setStatus] = useState(getStatus(cloud));

  const onCloudSyncChange = () => {
    setActualNamespaces([...cloud[cloudNamespaceProp]]);
  };

  const onCloudFetchingChange = () => {
    setStatus(getStatus(cloud));
  };

  const onCloudStatusChange = () => {
    setStatus(getStatus(cloud));
  };

  useEffect(() => {
    // Listen namespaces update
    cloud.addEventListener(CLOUD_EVENTS.SYNC_CHANGE, onCloudSyncChange);
    // Listen fetching status (updating namespaces)
    cloud.addEventListener(CLOUD_EVENTS.FETCHING_CHANGE, onCloudFetchingChange);
    cloud.addEventListener(CLOUD_EVENTS.STATUS_CHANGE, onCloudStatusChange);

    return () => {
      cloud.removeEventListener(CLOUD_EVENTS.SYNC_CHANGE, onCloudSyncChange);
      cloud.removeEventListener(
        CLOUD_EVENTS.FETCHING_CHANGE,
        onCloudFetchingChange
      );
      cloud.removeEventListener(
        CLOUD_EVENTS.STATUS_CHANGE,
        onCloudStatusChange
      );
    };
  });

  return (
    <EnhancedTableRow
      key={`${cloud.cloudUrl}-${actualNamespaces.length}`}
      cloud={cloud}
      withCheckboxes={withCheckboxes}
      namespaces={actualNamespaces}
      status={status}
      {...rest}
    />
  );
};

TableRowListenerWrapper.propTypes = {
  cloud: PropTypes.object.isRequired,
  withCheckboxes: PropTypes.bool.isRequired,
  isSyncStarted: PropTypes.bool,
  getDataToSync: PropTypes.func,

  /**
   * Called to get context menu items for a given Cloud.
   *
   * Signature: `(cloud: Cloud) => Array<{ title: string, disabled?: boolean, onClick: () => void }>`
   *
   * - `cloud`: The Cloud for which to get items.
   * - Returns: Array of objects that describe menu items in the Lens MenuItem component.
   *     The `title` property becomes the item's `children`, and the rest of the properties
   *     are props spread onto a `MenuItem` component.
   */
  getCloudMenuItems: PropTypes.func,

  /**
   * Called to get context menu items for a given Namespace in a Cloud.
   *
   * Signature: `(cloud: Cloud, namespace: CloudNamespace) => Array<{ title: string, disabled?: boolean, onClick: () => void }>`
   *
   * - `cloud`: The Cloud for which to get items.
   * - `namespace`: A namespace in the `cloud` for which to get items.
   * - Returns: Array of objects that describe menu items in the Lens MenuItem component.
   *     The `title` property becomes the item's `children`, and the rest of the properties
   *     are props spread onto a `MenuItem` component.
   */
  getNamespaceMenuItems: PropTypes.func,
};

TableRowListenerWrapper.defaultProps = {
  getCloudMenuItems: () => [],
  getNamespaceMenuItems: () => [],
};
