import propTypes from 'prop-types';
import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { Renderer } from '@k8slens/extensions';
import * as strings from '../../../../strings';
import { CONNECTION_STATUSES } from '../../../../common/Cloud';
import { formatDate } from '../../../rendererUtil';
import { apiKinds, apiUpdateStatuses } from '../../../../api/apiConstants';
import { useCloudSync } from '../useCloudSync';
import { useTableSearch } from '../useTableSearch';
import { ItemsTable } from '../ItemsTable';
import {
  TablePanelWrapper,
  TableTopItems,
  TableSettings,
  TableSyncButton,
  TableSearch,
} from '../clusterPageComponents';

const TABLE_HEADER_IDS = {
  STATUS: 'status',
  DATE: 'date',
  NAME: 'name',
  MESSAGE: 'message',
  MACHINE: 'machine',
  FROM_RELEASE: 'from-release',
  TO_RELEASE: 'to-release',
};

const {
  Component: { Icon },
} = Renderer;

const {
  catalog: {
    entities: {
      common: {
        details: { unknownValue },
      },
    },
  },
} = strings;

const defaultFilters = {
  searchText: '',
  sort: {
    sortBy: TABLE_HEADER_IDS.DATE,
    isAsc: true,
  },
};
const tableHeaders = [
  {
    id: TABLE_HEADER_IDS.STATUS,
    label: strings.clusterPage.pages.history.table.headers.status(),
  },
  {
    id: TABLE_HEADER_IDS.DATE,
    label: strings.clusterPage.pages.history.table.headers.date(),
  },
  {
    id: TABLE_HEADER_IDS.NAME,
    label: strings.clusterPage.pages.history.table.headers.name(),
    isBiggerCell: true,
  },
  {
    id: TABLE_HEADER_IDS.MESSAGE,
    label: strings.clusterPage.pages.history.table.headers.message(),
    isBiggerCell: true,
  },
  {
    id: TABLE_HEADER_IDS.MACHINE,
    label: strings.clusterPage.pages.history.table.headers.machine(),
  },
  {
    id: TABLE_HEADER_IDS.FROM_RELEASE,
    label: strings.clusterPage.pages.history.table.headers.fromRelease(),
  },
  {
    id: TABLE_HEADER_IDS.TO_RELEASE,
    label: strings.clusterPage.pages.history.table.headers.toRelease(),
  },
];

const getStatusColor = (status) => {
  switch (status) {
    case apiUpdateStatuses.IN_PROGRESS:
      return 'var(--colorWarning)';
    case apiUpdateStatuses.SUCCESS:
      return 'var(--colorSuccess)';
    case apiUpdateStatuses.FAILED:
      return 'var(--colorError)';
    default:
      return 'var(--textColorPrimary)';
  }
};

/**
 * Creates array with arrays of history values objects for future render.
 * @param {Array} history array with history update objects.
 * @returns {Array<Array<{ text: string, color?: string, isBiggerCell?: boolean }>>} array with arrays of objects.
 */
const generateItems = (history) => {
  return history.map((item) => {
    return [
      {
        text: item.status || unknownValue(),
        color: getStatusColor(item.status),
      },
      {
        text: formatDate(item.timeAt, false),
      },
      {
        text: item.name || unknownValue(),
        isBiggerCell: true,
      },
      {
        text: item.message || strings.clusterPage.common.emptyValue(),
        isBiggerCell: true,
      },
      {
        text:
          item.targetKind === apiKinds.MACHINE
            ? item.targetName || unknownValue()
            : strings.clusterPage.common.emptyValue(),
      },
      {
        text: item.fromRelease || strings.clusterPage.common.emptyValue(),
      },
      {
        text: item.release || strings.clusterPage.common.emptyValue(),
      },
    ];
  });
};

/**
 * Creates array of objects with needed items from nested objects.
 * @param {Array<ResourceUpdate>} updates List of resource updates.
 * @returns {Array<{ status: string, timeAt: string, name: string, message: string, targetKind: string, targetName: string, fromRelease: string|null, release: string }>} List of history objects.
 */
const getHistory = (updates) => {
  return updates.flatMap((update) =>
    update.spec.stages.map((stage) => ({
      status: stage.status,
      timeAt: stage.timeAt,
      name: stage.name,
      message: stage.message,
      targetKind: update.spec.targetKind,
      targetName: update.spec.targetName,
      fromRelease: update.spec.fromRelease,
      release: update.spec.release,
    }))
  );
};

//
// MAIN COMPONENT
//

export const HistoryPanel = ({ clusterEntity }) => {
  const targetRef = useRef();
  const history = useMemo(
    () => getHistory(clusterEntity.spec.updates),
    [clusterEntity.spec.updates]
  );

  const [isLoading, setIsLoading] = useState(false);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [isFiltered, setIsFiltered] = useState(false);
  const [topBarHeight, setTopBarHeight] = useState(0);

  const { searchResults } = useTableSearch({
    searchText: filters.searchText,
    searchItems: history,
  });

  const { isCloudFetching, cloudStatus, handleSyncCloud } = useCloudSync(
    clusterEntity.metadata.cloudUrl
  );

  useLayoutEffect(() => {
    if (targetRef.current) {
      setTopBarHeight(targetRef.current.offsetHeight);
    }
  }, []);

  useEffect(() => {
    setFilteredHistory(history);
    setIsLoading(false);
  }, [history]);

  useEffect(() => {
    const sortedHistory = [...searchResults].sort((a, b) => {
      if (filters.sort.sortBy === TABLE_HEADER_IDS.STATUS) {
        return filters.sort.isAsc
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status);
      }
      if (filters.sort.sortBy === TABLE_HEADER_IDS.DATE) {
        return filters.sort.isAsc
          ? a.timeAt.localeCompare(b.timeAt)
          : b.timeAt.localeCompare(a.timeAt);
      }
      if (filters.sort.sortBy === TABLE_HEADER_IDS.NAME) {
        return filters.sort.isAsc
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      if (filters.sort.sortBy === TABLE_HEADER_IDS.MACHINE) {
        return filters.sort.isAsc
          ? a.targetName.localeCompare(b.targetName)
          : b.targetName.localeCompare(a.targetName);
      }
      if (filters.sort.sortBy === TABLE_HEADER_IDS.FROM_RELEASE) {
        return filters.sort.isAsc
          ? a.fromRelease.localeCompare(b.fromRelease)
          : b.fromRelease.localeCompare(a.fromRelease);
      }
      if (filters.sort.sortBy === TABLE_HEADER_IDS.TO_RELEASE) {
        return filters.sort.isAsc
          ? a.release.localeCompare(b.release)
          : b.release.localeCompare(a.release);
      }
    });

    setFilteredHistory(sortedHistory);

    if (filters.searchText) {
      setIsFiltered(true);
    } else {
      setIsFiltered(false);
    }
  }, [filters, searchResults]);

  const handleSearchChange = useCallback(
    (e) => {
      setFilters({ ...filters, searchText: e.target.value });
    },
    [filters]
  );

  const handleSortChange = useCallback(
    (sortBy, isAsc) => {
      setFilters({
        ...filters,
        sort: {
          sortBy,
          isAsc: sortBy === filters.sort.sortBy ? isAsc : true,
        },
      });
    },
    [filters]
  );

  const handleResetSearch = useCallback(() => {
    setFilters({ ...filters, searchText: '' });
  }, [filters]);

  return (
    <TablePanelWrapper>
      <TableTopItems ref={targetRef}>
        <p>{strings.clusterPage.pages.history.title()}</p>
        <p>
          {strings.clusterPage.pages.history.itemsAmount(
            filteredHistory.length
          )}
        </p>
        <TableSettings>
          <TableSyncButton
            isDisabled={
              isCloudFetching || cloudStatus !== CONNECTION_STATUSES.CONNECTED
            }
            isCloudFetching={isCloudFetching}
            onClick={handleSyncCloud}
          >
            <Icon material="refresh" />
          </TableSyncButton>
          <TableSearch
            placeholder={strings.clusterPage.pages.history.searchPlaceholder()}
            value={filters.searchText}
            onInput={handleSearchChange}
          />
        </TableSettings>
      </TableTopItems>
      <ItemsTable
        tableHeaders={tableHeaders}
        items={generateItems(filteredHistory)}
        onSortChange={handleSortChange}
        onResetSearch={handleResetSearch}
        sort={filters.sort}
        isFiltered={isFiltered}
        isLoading={isLoading}
        topBarHeight={topBarHeight}
        noItemsFoundMessage={strings.clusterPage.pages.history.table.noHistoryFound()}
        emptyListMessage={strings.clusterPage.pages.history.table.emptyList()}
      />
    </TablePanelWrapper>
  );
};

HistoryPanel.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
