import propTypes from 'prop-types';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/css';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../../styles';
import * as strings from '../../../../strings';
import * as consts from '../../../../constants';
import { apiKinds } from '../../../../api/apiConstants';
import { CLOUD_EVENTS, CONNECTION_STATUSES } from '../../../../common/Cloud';
import { IpcRenderer } from '../../../IpcRenderer';
import { useClouds } from '../../../store/CloudProvider';
import { useTableSearch } from './useTableSearch';

const {
  Component: {
    Icon,
    SearchInput,
    Select,
    Table,
    TableHead,
    TableRow,
    TableCell,
  },
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
const TABLE_HEADER_IDS = {
  TYPE: 'type',
  DATE: 'date',
  MESSAGE: 'message',
  SOURCE: 'source',
  MACHINE: 'machine',
  COUNT: 'count',
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

const formatDate = (date) => {
  if (!date) {
    return undefined;
  }

  const dateObj = new Date(date);
  return dateObj.getTime() === 0
    ? undefined
    : dayjs(date).format('YYYY-MM-DD, HH:mm:ss');
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

const FirstCellUiReformer = styled.div(() => ({
  width: layout.grid * 2,
  display: 'inline-block',
}));

const TableMessageCell = styled.div`
  display: flex;
  align-items: center;
  flex: 3 0;
  padding: ${layout.pad}px;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
  color: ${({ isWarning, isHeader }) =>
    isWarning
      ? 'var(--colorError)'
      : isHeader
      ? 'var(--tableHeaderColor)'
      : 'var(--textColorPrimary)'};
`;

//
// MAIN COMPONENT
//

export const EventsPanel = ({ clusterEntity }) => {
  const { clouds } = useClouds();
  const cloudUrl = clusterEntity.metadata.cloudUrl;
  const events = clusterEntity.spec.events;

  const [searchValue, setSearchValue] = useState(null);
  const [sourceOptions, setSourceOptions] = useState(ALL_SOURCES_VALUE);
  const [sorting, setSorting] = useState({
    key: TABLE_HEADER_IDS.DATE,
    ascending: true,
  });
  const [isFetching, setIsFetching] = useState(false);
  const [status, setStatus] = useState(clouds[cloudUrl].status);

  const { searchedData } = useTableSearch({
    searchValue,
    data: events,
  });

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

  const handleSelectChange = (newSelection) => {
    const newValue = newSelection?.value || null;
    setSourceOptions(newValue);
  };

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

  const getFilteredData = () => {
    if (sourceOptions === ALL_SOURCES_VALUE) {
      return searchedData;
    } else {
      const filteredData = searchedData.filter(
        (event) => event.metadata.source === sourceOptions
      );
      return filteredData;
    }
  };

  const applySorting = (key, ascending) => {
    setSorting({ key: key, ascending: key === sorting.key ? ascending : true });
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
            value={sourceOptions}
            onChange={handleSelectChange}
          />
          <Search
            placeholder={strings.clusterPage.pages.events.searchPlaceholder()}
            value={searchValue}
            onChange={setSearchValue}
          />
        </Settings>
      </TopItems>
      <Table>
        <TableHead showTopLine>
          {tableHeaders.map((header, index) => {
            if (header.id === TABLE_HEADER_IDS.MESSAGE) {
              return (
                <TableMessageCell key={header.id} isHeader>
                  {index === 0 && <FirstCellUiReformer></FirstCellUiReformer>}
                  {header.label}
                </TableMessageCell>
              );
            } else if (header.id === TABLE_HEADER_IDS.SOURCE) {
              return (
                <TableCell key={header.id}>
                  {index === 0 && <FirstCellUiReformer></FirstCellUiReformer>}
                  {header.label}
                </TableCell>
              );
            } else {
              return (
                <TableCell key={header.id}>
                  {index === 0 && <FirstCellUiReformer></FirstCellUiReformer>}
                  {header.label}
                  <button
                    onClick={() => applySorting(header.id, !sorting.ascending)}
                  >
                    <Icon material="arrow_drop_down" />
                  </button>
                </TableCell>
              );
            }
          })}
        </TableHead>
        {getFilteredData().map((event) => (
          <TableRow key={event.metadata.name}>
            <TableCell>
              <FirstCellUiReformer></FirstCellUiReformer>
              {event.spec.type || unknownValue()}
            </TableCell>
            <TableCell>{formatDate(clusterEntity.spec.createdAt)}</TableCell>
            <TableMessageCell isWarning={event.spec.type === 'Warning'}>
              {event.spec.message || unknownValue()}
            </TableMessageCell>
            <TableCell>{event.metadata.source || unknownValue()}</TableCell>
            <TableCell>
              {event.spec.targetKind === apiKinds.MACHINE
                ? event.spec.targetName || unknownValue()
                : strings.clusterPage.common.emptyValue()}
            </TableCell>
            <TableCell>{event.spec.count || unknownValue()}</TableCell>
          </TableRow>
        ))}
      </Table>
    </PanelWrapper>
  );
};

EventsPanel.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
