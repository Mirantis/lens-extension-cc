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

  const [isFetching, setIsFetching] = useState(false);
  const [status, setStatus] = useState(clouds[cloudUrl].status);
  const [events, setEvents] = useState([]);
  const [modifiedEvents, setModifiedEvents] = useState([]);
  const [modifiers, setModifiers] = useState({
    searchQuery: '',
    filterBy: ALL_SOURCES_VALUE,
    sort: {
      sortBy: TABLE_HEADER_IDS.DATE,
      isAsc: true,
    },
  });

  const { searchedData } = useTableSearch({
    searchValue: modifiers.searchQuery,
    data: events,
  });

  useEffect(() => {
    setEvents(clusterEntity.spec.events);
    setModifiedEvents(clusterEntity.spec.events);
  }, [clusterEntity]);

  useEffect(() => {
    const filteredEvents =
      modifiers.filterBy === ALL_SOURCES_VALUE
        ? searchedData
        : searchedData.filter(
            (event) => event.metadata.source === modifiers.filterBy
          );

    const sortedEvents = [...filteredEvents].sort((a, b) => {
      if (modifiers.sort.sortBy === TABLE_HEADER_IDS.TYPE) {
        return a.spec.type.localeCompare(b.spec.type);
      }
      if (modifiers.sort.sortBy === TABLE_HEADER_IDS.DATE) {
        return a.spec.createdAt.localeCompare(b.spec.createdAt);
      }
      if (modifiers.sort.sortBy === TABLE_HEADER_IDS.MACHINE) {
        return a.spec.targetName.localeCompare(b.spec.targetName);
      }
      if (modifiers.sort.sortBy === TABLE_HEADER_IDS.COUNT) {
        return a.spec.count - b.spec.count;
      }
    });

    setModifiedEvents(
      modifiers.sort.isAsc ? sortedEvents : sortedEvents.reverse()
    );
  }, [modifiers, searchedData]);

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
    setModifiers({ ...modifiers, filterBy: newValue });
  };

  const handleSearchChange = (e) => {
    setModifiers({ ...modifiers, searchQuery: e.target.value });
  };

  const handleSortChange = (sortBy, isAsc) => {
    setModifiers({
      ...modifiers,
      sort: {
        sortBy,
        isAsc: sortBy === modifiers.sort.sortBy ? isAsc : true,
      },
    });
  };

  return (
    <PanelWrapper>
      <TopItems>
        <p>{strings.clusterPage.pages.events.title()}</p>
        <p>{strings.clusterPage.pages.events.itemsAmount(events.length)}</p>
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
            value={modifiers.filterBy}
            onChange={handleSelectChange}
          />
          <Search
            placeholder={strings.clusterPage.pages.events.searchPlaceholder()}
            value={modifiers.searchQuery}
            onInput={handleSearchChange}
          />
        </Settings>
      </TopItems>
      <EventsTable
        tableHeaders={tableHeaders}
        events={modifiedEvents}
        handleSortChange={handleSortChange}
        isSortedByAsc={modifiers.sort.isAsc}
      />
    </PanelWrapper>
  );
};

EventsPanel.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
