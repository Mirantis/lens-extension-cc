import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { EXTENDED_CLOUD_EVENTS } from '../../../common/ExtendedCloud';
import { EnhancedTableRow } from './EnhancedTableRow';

/**
 * @param {ExtendedCloud} extendedCloud
 * @param {'namespaces'|'syncedNamespaces'} usedNamespaces if true and connected - it returns all namespaces to populate in SyncView mode
 * @param {boolean} withCheckboxes
 * @return {Array<Object>} It might be an array og Namespaces or just {name: _namespaceName_ }, depending on cloud.connected
 */
const getNamespaces = ({extendedCloud, usedNamespaces, withCheckboxes}) => {
  // if loaded return Namespaces class object from EC
  if (extendedCloud.loaded) {
    return extendedCloud[usedNamespaces];
  }
  // if cloud disconnected and Selected view - return allNamespaces stored in Cloud
  if(withCheckboxes) {
    return extendedCloud.cloud.allNamespaces.map((name) => ({ name }));
  }
  // if cloud disconnected and Sync View - return just syncedNamespaces stored in Cloud
  return extendedCloud.cloud.syncedNamespaces.map((name) => ({ name }));
};

// We need this level of abstraction mostly for 'key' prop for `EnhancedTableRow`.
// When EC is connecting or fetch data, we use EC.cloud.syncedNamespaces in selective mode (we don't know namespaces yet)
// When they come by updateNamespaces listener - we have to fully rerender row component to force useCheckboxes hook to take new extendedCloud data
// without that we have incorrect checkboxes state in Selected Sync view
// besides - keep useEffect listeners in separate level looks not so bad. Code become more readable
export const TableRowListenerWrapper = ({
  extendedCloud,
  withCheckboxes,
  ...rest
}) => {
  const usedNamespaces = withCheckboxes ? 'namespaces' : 'syncedNamespaces';

  const [actualNamespaces, setActualNamespaces] = useState(
    getNamespaces({extendedCloud, usedNamespaces, withCheckboxes})
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
    extendedCloud.addEventListener(
      EXTENDED_CLOUD_EVENTS.DATA_UPDATED,
      updateNamespaces
    );
    // Listen fetching status (updating namespaces)
    extendedCloud.addEventListener(
      EXTENDED_CLOUD_EVENTS.FETCHING_CHANGE,
      listenFetching
    );
    return () => {
      extendedCloud.removeEventListener(
        EXTENDED_CLOUD_EVENTS.DATA_UPDATED,
        updateNamespaces
      );
      extendedCloud.removeEventListener(
        EXTENDED_CLOUD_EVENTS.FETCHING_CHANGE,
        listenFetching
      );
    };
  });

  return (
    <EnhancedTableRow
      key={`${extendedCloud.cloud.url}-${actualNamespaces.length}`}
      extendedCloud={extendedCloud}
      withCheckboxes={withCheckboxes}
      namespaces={actualNamespaces}
      fetching={isFetching}
      {...rest}
    />
  );
};

TableRowListenerWrapper.propTypes = {
  extendedCloud: PropTypes.object.isRequired,
  withCheckboxes: PropTypes.bool.isRequired,
};
