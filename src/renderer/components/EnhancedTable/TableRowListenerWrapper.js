import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { DATA_CLOUD_EVENTS } from '../../../common/DataCloud';
import { EnhancedTableRow } from './EnhancedTableRow';

/**
 * @param {DataCloud} dataCloud
 * @param {'namespaces'|'syncedNamespaces'} usedNamespaces if true and connected - it returns all namespaces to populate in SyncView mode
 * @param {boolean} withCheckboxes
 * @return {Array<Object>} It might be an array og Namespaces or just {name: _namespaceName_ }, depending on cloud.connected
 */
const getNamespaces = ({ dataCloud, usedNamespaces, withCheckboxes }) => {
  // if loaded return Namespaces class object from EC
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
// When EC is connecting or fetch data, we use EC.cloud.syncedNamespaces in selective mode (we don't know namespaces yet)
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
  const [isFetching, setFetching] = useState(false);

  const updateNamespaces = (updatedRow) => {
    if (updatedRow) {
      setActualNamespaces(updatedRow[usedNamespaces]);
    }
  };

  const listenFetching = (cl) => setFetching(cl.fetching);

  useEffect(() => {
    // Listen namespaces update
    dataCloud.addEventListener(
      DATA_CLOUD_EVENTS.DATA_UPDATED,
      updateNamespaces
    );
    // Listen fetching status (updating namespaces)
    dataCloud.addEventListener(
      DATA_CLOUD_EVENTS.FETCHING_CHANGE,
      listenFetching
    );
    return () => {
      dataCloud.removeEventListener(
        DATA_CLOUD_EVENTS.DATA_UPDATED,
        updateNamespaces
      );
      dataCloud.removeEventListener(
        DATA_CLOUD_EVENTS.FETCHING_CHANGE,
        listenFetching
      );
    };
  });

  return (
    <EnhancedTableRow
      key={`${dataCloud.cloud.url}-${actualNamespaces.length}`}
      dataCloud={dataCloud}
      withCheckboxes={withCheckboxes}
      namespaces={actualNamespaces}
      fetching={isFetching}
      {...rest}
    />
  );
};

TableRowListenerWrapper.propTypes = {
  dataCloud: PropTypes.object.isRequired,
  withCheckboxes: PropTypes.bool.isRequired,
};
