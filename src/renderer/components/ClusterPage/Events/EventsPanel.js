import propTypes from 'prop-types';
import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/css';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../../styles';
import * as strings from '../../../../strings';
import * as consts from '../../../../constants';
import { CLOUD_EVENTS, CONNECTION_STATUSES } from '../../../../common/Cloud';
import { IpcRenderer } from '../../../IpcRenderer';
import { useClouds } from '../../../store/CloudProvider';
import { useTableSearch } from './useTableSearch';
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
  searchQuery: '',
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
  animation: ${({ isFetching }) =>
    isFetching ? `${rotate} 2s linear infinite` : 'none'};
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

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [status, setStatus] = useState(clouds[cloudUrl].status);
  const [events, setEvents] = useState([]);
  const [modifiedEvents, setModifiedEvents] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [isFiltered, setIsFiltered] = useState(false);

  const { searchedData } = useTableSearch({
    searchQuery: filters.searchQuery,
    data: events,
  });

  useEffect(() => {
    setEvents(clusterEntity.spec.events);
    setModifiedEvents(clusterEntity.spec.events);
    setIsLoading(false);
  }, [clusterEntity]);

  useEffect(() => {
    const filteredEvents =
      filters.filterBy === ALL_SOURCES_VALUE
        ? searchedData
        : searchedData.filter(
            (event) => event.metadata.source === filters.filterBy
          );

    const sortedEvents = [...filteredEvents].sort((a, b) => {
      if (filters.sort.sortBy === TABLE_HEADER_IDS.TYPE) {
        return a.spec.type.localeCompare(b.spec.type);
      }
      if (filters.sort.sortBy === TABLE_HEADER_IDS.DATE) {
        return a.spec.createdAt.localeCompare(b.spec.createdAt);
      }
      if (filters.sort.sortBy === TABLE_HEADER_IDS.MACHINE) {
        return a.spec.targetName.localeCompare(b.spec.targetName);
      }
      if (filters.sort.sortBy === TABLE_HEADER_IDS.COUNT) {
        return a.spec.count - b.spec.count;
      }
    });

    setModifiedEvents(
      filters.sort.isAsc ? sortedEvents : sortedEvents.reverse()
    );

    if (filters.searchQuery) {
      setIsFiltered(true);
    } else {
      setIsFiltered(false);
    }
  }, [filters, searchedData]);

  useEffect(() => {
    const onCloudFetchingChange = () => {
      setIsFetching(clouds[cloudUrl].fetching);
      setStatus(clouds[cloudUrl].status);
    };

    const onCloudStatusChange = () => {
      setIsFetching(clouds[cloudUrl].fetching);
      setStatus(clouds[cloudUrl].status);
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

  const handleSync = () => {
    IpcRenderer.getInstance().invoke(
      consts.ipcEvents.invoke.SYNC_NOW,
      clusterEntity.metadata.cloudUrl
    );
  };

  const getSourceOptions = () => {
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

  const handleSelectChange = (newSelection) => {
    const newValue = newSelection?.value || null;
    setFilters({ ...filters, filterBy: newValue });
  };

  const handleSearchChange = (e) => {
    setFilters({ ...filters, searchQuery: e.target.value });
  };

  const handleSortChange = (sortBy, isAsc) => {
    setFilters({
      ...filters,
      sort: {
        sortBy,
        isAsc: sortBy === filters.sort.sortBy ? isAsc : true,
      },
    });
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <PanelWrapper>
      <TopItems>
        <p>{strings.clusterPage.pages.events.title()}</p>
        <p>{strings.clusterPage.pages.events.itemsAmount(modifiedEvents.length)}</p>
        <Settings>
          <SyncButton
            isDisabled={isFetching || status !== CONNECTION_STATUSES.CONNECTED}
            isFetching={isFetching}
            onClick={() => handleSync()}
          >
            <Icon material="refresh" />
          </SyncButton>
          <Select
            options={getSourceOptions()}
            value={filters.filterBy}
            onChange={handleSelectChange}
          />
          <Search
            placeholder={strings.clusterPage.pages.events.searchPlaceholder()}
            value={filters.searchQuery}
            onInput={handleSearchChange}
          />
        </Settings>
      </TopItems>
      <EventsTable
        tableHeaders={tableHeaders}
        events={modifiedEvents}
        handleSortChange={handleSortChange}
        handleResetFilters={handleResetFilters}
        isSortedByAsc={filters.sort.isAsc}
        isFiltered={isFiltered}
        isLoading={isLoading}
      />
    </PanelWrapper>
  );
};

EventsPanel.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
