import propTypes from 'prop-types';
import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { Renderer } from '@k8slens/extensions';
import * as strings from '../../../../strings';
import { CONNECTION_STATUSES } from '../../../../common/Cloud';
import { formatDate } from '../../../rendererUtil';
import { apiKinds } from '../../../../api/apiConstants';
import { useTableSearch } from '../useTableSearch';
import { useCloudSync } from '../useCloudSync';
import { ItemsTable } from '../ItemsTable';
import {
  TablePanelWrapper,
  TableTopItems,
  TableSettings,
  TableSyncButton,
  TableSearch,
} from '../clusterPageComponents';

const TABLE_HEADER_IDS = {
  TYPE: 'type',
  DATE: 'date',
  MESSAGE: 'message',
  SOURCE: 'source',
  MACHINE: 'machine',
  COUNT: 'count',
};

const {
  Component: { Icon, Select },
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

const ALL_SOURCES_VALUE = 'all-sources';
const defaultSourceOption = {
  value: ALL_SOURCES_VALUE,
  label: strings.clusterPage.pages.events.defaultSourceOption(),
};
const defaultFilters = {
  searchText: '',
  filterBy: ALL_SOURCES_VALUE,
  sort: {
    sortBy: TABLE_HEADER_IDS.DATE,
    isAsc: true,
  },
};
const tableHeaders = [
  {
    id: TABLE_HEADER_IDS.TYPE,
    label: strings.clusterPage.pages.events.table.headers.type(),
  },
  {
    id: TABLE_HEADER_IDS.DATE,
    label: strings.clusterPage.pages.events.table.headers.date(),
  },
  {
    id: TABLE_HEADER_IDS.MESSAGE,
    label: strings.clusterPage.pages.events.table.headers.message(),
    isBiggerCell: true,
  },
  {
    id: TABLE_HEADER_IDS.SOURCE,
    label: strings.clusterPage.pages.events.table.headers.source(),
  },
  {
    id: TABLE_HEADER_IDS.MACHINE,
    label: strings.clusterPage.pages.events.table.headers.machine(),
  },
  {
    id: TABLE_HEADER_IDS.COUNT,
    label: strings.clusterPage.pages.events.table.headers.count(),
  },
];

/**
 * Creates array with arrays of events values objects for future render.
 * @param {Array} events array with events update objects.
 * @returns {Array<Array<{ text: string, color?: string, isBiggerCell?: boolean }>>} array with arrays of objects.
 */
const generateItems = (events) => {
  return events.map((event) => {
    return [
      {
        text: event.spec.type || unknownValue(),
      },
      {
        text: formatDate(event.spec.createdAt, false),
      },
      {
        text: event.spec.message || unknownValue(),
        isBiggerCell: true,
        color:
          event.spec.type === 'Warning'
            ? 'var(--colorError)'
            : 'var(--textColorPrimary)',
      },
      {
        text: event.metadata.source || unknownValue(),
      },
      {
        text:
          event.spec.targetKind === apiKinds.MACHINE
            ? event.spec.targetName || unknownValue()
            : strings.clusterPage.common.emptyValue(),
      },
      {
        text: `${event.spec.count}` || unknownValue(),
      },
    ];
  });
};

//
// MAIN COMPONENT
//

export const EventsPanel = ({ clusterEntity }) => {
  const targetRef = useRef();

  const [isLoading, setIsLoading] = useState(false);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [isFiltered, setIsFiltered] = useState(false);
  const [topBarHeight, setTopBarHeight] = useState(0);

  const { searchResults } = useTableSearch({
    searchText: filters.searchText,
    searchItems: clusterEntity.spec.events,
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
    setFilteredEvents(clusterEntity.spec.events);
    setIsLoading(false);
  }, [clusterEntity]);

  useEffect(() => {
    const sortedEvents = [
      ...(filters.filterBy === ALL_SOURCES_VALUE
        ? searchResults
        : searchResults.filter(
            (event) => event.metadata.source === filters.filterBy
          )),
    ].sort((a, b) => {
      if (filters.sort.sortBy === TABLE_HEADER_IDS.TYPE) {
        return filters.sort.isAsc
          ? a.spec.type.localeCompare(b.spec.type)
          : b.spec.type.localeCompare(a.spec.type);
      }
      if (filters.sort.sortBy === TABLE_HEADER_IDS.DATE) {
        return filters.sort.isAsc
          ? a.spec.createdAt.localeCompare(b.spec.createdAt)
          : b.spec.createdAt.localeCompare(a.spec.createdAt);
      }
      if (filters.sort.sortBy === TABLE_HEADER_IDS.SOURCE) {
        return filters.sort.isAsc
          ? a.metadata.source.localeCompare(b.metadata.source)
          : b.metadata.source.localeCompare(a.metadata.source);
      }
      if (filters.sort.sortBy === TABLE_HEADER_IDS.MACHINE) {
        return filters.sort.isAsc
          ? a.spec.targetName.localeCompare(b.spec.targetName)
          : b.spec.targetName.localeCompare(a.spec.targetName);
      }
      if (filters.sort.sortBy === TABLE_HEADER_IDS.COUNT) {
        return filters.sort.isAsc
          ? a.spec.count - b.spec.count
          : b.spec.count - a.spec.count;
      }
    });

    setFilteredEvents(sortedEvents);

    if (filters.searchText) {
      setIsFiltered(true);
    } else {
      setIsFiltered(false);
    }
  }, [filters, searchResults]);

  const getSourceOptions = (events) => {
    const uniqueSources = [
      ...new Set(events.map(({ metadata: { source } }) => source)),
    ];

    return [
      defaultSourceOption,
      ...uniqueSources.map((source) => ({
        value: source,
        label: source,
      })),
    ];
  };

  const sourceOptions = useMemo(
    () => getSourceOptions(clusterEntity.spec.events),
    [clusterEntity.spec.events]
  );

  const handleSelectChange = useCallback(
    (newSelection) => {
      const newValue = newSelection?.value || null;
      setFilters({ ...filters, filterBy: newValue });
    },
    [filters]
  );

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
        <p>{strings.clusterPage.pages.events.title()}</p>
        <p>
          {strings.clusterPage.pages.events.itemsAmount(filteredEvents.length)}
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
          <Select
            options={sourceOptions}
            value={filters.filterBy}
            onChange={handleSelectChange}
          />
          <TableSearch
            placeholder={strings.clusterPage.pages.events.searchPlaceholder()}
            value={filters.searchText}
            onInput={handleSearchChange}
          />
        </TableSettings>
      </TableTopItems>
      <ItemsTable
        tableHeaders={tableHeaders}
        items={generateItems(filteredEvents)}
        onSortChange={handleSortChange}
        onResetSearch={handleResetSearch}
        sort={filters.sort}
        isFiltered={isFiltered}
        isLoading={isLoading}
        topBarHeight={topBarHeight}
        noItemsFoundMessage={strings.clusterPage.pages.events.table.noEventsFound()}
        emptyListMessage={strings.clusterPage.pages.events.table.emptyList()}
      />
    </TablePanelWrapper>
  );
};

EventsPanel.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
