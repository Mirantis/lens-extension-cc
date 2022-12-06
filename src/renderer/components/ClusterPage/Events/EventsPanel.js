import propTypes from 'prop-types';
import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/css';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../../styles';
import * as strings from '../../../../strings';
import * as consts from '../../../../constants';
import { CLOUD_EVENTS, CONNECTION_STATUSES } from '../../../../common/Cloud';
import { IpcRenderer } from '../../../IpcRenderer';
import { useClouds } from '../../../store/CloudProvider';
import { useTableSearch } from '../useTableSearch';
import { EventsTable } from './EventsTable';

export const TABLE_HEADER_IDS = {
  TYPE: 'type',
  DATE: 'date',
  MESSAGE: 'message',
  SOURCE: 'source',
  MACHINE: 'machine',
  COUNT: 'count',
};

const {
  Component: { Icon, SearchInput, Select },
} = Renderer;

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

const handleSync = (cloudUrl) => {
  IpcRenderer.getInstance().invoke(consts.ipcEvents.invoke.SYNC_NOW, cloudUrl);
};

//
// INTERNAL STYLED COMPONENTS
//

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const PanelWrapper = styled.div(() => ({
  background: 'var(--contentColor)',
  height: '100%',
}));

const TopItems = styled.div(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: layout.pad * 2,
}));

const Settings = styled.div(() => ({
  display: 'flex',
  alignItems: 'center',
}));

const SyncButton = styled.button`
  margin-right: ${layout.pad * 2}px;
  pointer-events: ${({ isDisabled }) => (isDisabled ? 'none' : 'auto')};
  opacity: ${({ isDisabled }) => (isDisabled ? '0.5' : '1')};
  animation: ${({ isCloudFetching }) =>
    isCloudFetching ? `${rotate} 2s linear infinite` : 'none'};
`;

const Search = styled(SearchInput)(() => ({
  marginLeft: layout.pad * 1.25,
}));

//
// MAIN COMPONENT
//

export const EventsPanel = ({ clusterEntity }) => {
  const cloudUrl = clusterEntity.metadata.cloudUrl;
  const { clouds } = useClouds();
  const targetRef = useRef();

  const [isLoading, setIsLoading] = useState(false);
  const [isCloudFetching, setIsCloudFetching] = useState(false);
  const [cloudStatus, setCloudStatus] = useState(clouds[cloudUrl].status);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [isFiltered, setIsFiltered] = useState(false);
  const [topBarHeight, setTopBarHeight] = useState(0);

  const { searchResults } = useTableSearch({
    searchText: filters.searchText,
    searchItems: clusterEntity.spec.events,
  });

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
        return a.spec.type.localeCompare(b.spec.type);
      }
      if (filters.sort.sortBy === TABLE_HEADER_IDS.DATE) {
        return a.spec.createdAt.localeCompare(b.spec.createdAt);
      }
      if (filters.sort.sortBy === TABLE_HEADER_IDS.SOURCE) {
        return a.metadata.source.localeCompare(b.metadata.source);
      }
      if (filters.sort.sortBy === TABLE_HEADER_IDS.MACHINE) {
        return a.spec.targetName.localeCompare(b.spec.targetName);
      }
      if (filters.sort.sortBy === TABLE_HEADER_IDS.COUNT) {
        return a.spec.count - b.spec.count;
      }
    });

    setFilteredEvents(
      filters.sort.isAsc ? sortedEvents : sortedEvents.reverse()
    );

    if (filters.searchText) {
      setIsFiltered(true);
    } else {
      setIsFiltered(false);
    }
  }, [filters, searchResults]);

  useEffect(() => {
    const onCloudFetchingChange = () => {
      setIsCloudFetching(clouds[cloudUrl].fetching);
      setCloudStatus(clouds[cloudUrl].status);
    };

    const onCloudStatusChange = () => {
      setIsCloudFetching(clouds[cloudUrl].fetching);
      setCloudStatus(clouds[cloudUrl].status);
    };

    // Listen fetching status
    clouds[cloudUrl].addEventListener(
      CLOUD_EVENTS.FETCHING_CHANGE,
      onCloudFetchingChange
    );
    clouds[cloudUrl].addEventListener(
      CLOUD_EVENTS.STATUS_CHANGE,
      onCloudStatusChange
    );

    return () => {
      clouds[cloudUrl].removeEventListener(
        CLOUD_EVENTS.FETCHING_CHANGE,
        onCloudFetchingChange
      );
      clouds[cloudUrl].removeEventListener(
        CLOUD_EVENTS.STATUS_CHANGE,
        onCloudStatusChange
      );
    };
  }, [clouds, cloudUrl]);

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
    <PanelWrapper>
      <TopItems ref={targetRef}>
        <p>{strings.clusterPage.pages.events.title()}</p>
        <p>
          {strings.clusterPage.pages.events.itemsAmount(filteredEvents.length)}
        </p>
        <Settings>
          <SyncButton
            isDisabled={
              isCloudFetching || cloudStatus !== CONNECTION_STATUSES.CONNECTED
            }
            isCloudFetching={isCloudFetching}
            onClick={() => handleSync(clusterEntity.metadata.cloudUrl)}
          >
            <Icon material="refresh" />
          </SyncButton>
          <Select
            options={sourceOptions}
            value={filters.filterBy}
            onChange={handleSelectChange}
          />
          <Search
            placeholder={strings.clusterPage.pages.events.searchPlaceholder()}
            value={filters.searchText}
            onInput={handleSearchChange}
          />
        </Settings>
      </TopItems>
      <EventsTable
        tableHeaders={tableHeaders}
        events={filteredEvents}
        onSortChange={handleSortChange}
        onResetSearch={handleResetSearch}
        sort={filters.sort}
        isFiltered={isFiltered}
        isLoading={isLoading}
        topBarHeight={topBarHeight}
      />
    </PanelWrapper>
  );
};

EventsPanel.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
