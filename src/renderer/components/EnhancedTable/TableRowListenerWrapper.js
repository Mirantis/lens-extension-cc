import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { DATA_CLOUD_EVENTS } from '../../../common/DataCloud';
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
 * @param {boolean} isFetching
 * @return {{cloudStatus: string, namespaceStatus: string, styles: Object}}
 *  where `cloudStatus` and `namespaceStatus` are labels, and `styles` is
 *  a style object to apply to the label.
 */
const getStatus = (cloud, isFetching) => {
  if (isFetching) {
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

/**
 * @param {DataCloud} dataCloud
 * @param {'namespaces'|'syncedNamespaces'} usedNamespaces if true and connected - it returns all namespaces to populate in SyncView mode
 * @param {boolean} withCheckboxes
 * @return {Array<Object>} It might be an array og Namespaces or just {name: _namespaceName_ }, depending on cloud.connected
 */
const getNamespaces = ({ dataCloud, usedNamespaces, withCheckboxes }) => {
  // if loaded return Namespaces class object from DC
  if (dataCloud.loaded) {
    return dataCloud[usedNamespaces];
  }
  // if cloud disconnected and Selected view - return allNamespaces stored in Cloud
  if (withCheckboxes) {
    return dataCloud.cloud.allNamespaces.map((name) => ({ name }));
  }
  // if cloud disconnected and Sync View - return just syncedNamespaces stored in Cloud
  return dataCloud.cloud.syncedNamespaces.map((name) => ({ name }));
};

// We need this level of abstraction mostly for 'key' prop for `EnhancedTableRow`.
// When DC is connecting or fetch data, we use DC.cloud.syncedNamespaces in selective mode (we don't know namespaces yet)
// When they come by updateNamespaces listener - we have to fully rerender row component to force useCheckboxes hook to take new dataCloud data
// without that we have incorrect checkboxes state in Selected Sync view
// besides - keep useEffect listeners in separate level looks not so bad. Code become more readable
export const TableRowListenerWrapper = ({
  dataCloud,
  withCheckboxes,
  ...rest
}) => {
  const usedNamespaces = withCheckboxes ? 'namespaces' : 'syncedNamespaces';

  const [actualNamespaces, setActualNamespaces] = useState(
    getNamespaces({ dataCloud, usedNamespaces, withCheckboxes })
  );
  const [isFetching, setFetching] = useState(dataCloud.fetching);
  const [status, setStatus] = useState(getStatus(dataCloud.cloud, isFetching));

  const onDataCloudDataUpdated = (dc) => {
    setActualNamespaces(dc[usedNamespaces]);
  };

  const onDataCloudFetchingChange = (dc) => {
    setFetching(dc.fetching);
    setStatus(getStatus(dc.cloud, dc.fetching));
  };

  const onCloudStatusChange = (cl) => {
    setStatus(getStatus(cl, isFetching));
  };

  useEffect(() => {
    // Listen namespaces update
    dataCloud.addEventListener(
      DATA_CLOUD_EVENTS.DATA_UPDATED,
      onDataCloudDataUpdated
    );
    // Listen fetching status (updating namespaces)
    dataCloud.addEventListener(
      DATA_CLOUD_EVENTS.FETCHING_CHANGE,
      onDataCloudFetchingChange
    );
    dataCloud.cloud.addEventListener(
      CLOUD_EVENTS.STATUS_CHANGE,
      onCloudStatusChange
    );

    return () => {
      dataCloud.removeEventListener(
        DATA_CLOUD_EVENTS.DATA_UPDATED,
        onDataCloudDataUpdated
      );
      dataCloud.removeEventListener(
        DATA_CLOUD_EVENTS.FETCHING_CHANGE,
        onDataCloudFetchingChange
      );
      dataCloud.cloud.removeEventListener(
        CLOUD_EVENTS.STATUS_CHANGE,
        onCloudStatusChange
      );
    };
  });

  return (
    <EnhancedTableRow
      key={`${dataCloud.cloud.url}-${actualNamespaces.length}`}
      dataCloud={dataCloud}
      withCheckboxes={withCheckboxes}
      namespaces={actualNamespaces}
      status={status}
      {...rest}
    />
  );
};

TableRowListenerWrapper.propTypes = {
  dataCloud: PropTypes.object.isRequired,
  withCheckboxes: PropTypes.bool.isRequired,
  isSyncStarted: PropTypes.bool,
  getDataToSync: PropTypes.func,
};
