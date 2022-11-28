import propTypes from 'prop-types';
import { useState } from 'react';
import dayjs from 'dayjs';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../../styles';
import * as strings from '../../../../strings';
import * as consts from '../../../../constants';
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

const ALL_SOURCES_VALUE = 'all-sources';
const defaultSourceOption = {
  value: ALL_SOURCES_VALUE,
  label: strings.clusterPage.pages.events.defaultSourceOption(),
};

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

const SyncButton = styled.button(() => ({
  marginRight: layout.pad * 2,
}));

const Search = styled(SearchInput)(() => ({
  marginLeft: layout.pad * 1.25,
}));

const FirstCell = styled(TableCell)(() => ({
  paddingLeft: layout.pad * 2,
}));

const TableMessageCell = styled.div`
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
  const [searchValue, setSearchValue] = useState(null);
  const [sourceOptions, setSourceOptions] = useState(ALL_SOURCES_VALUE);

  const events = clusterEntity.spec.events;
  const { searchedData } = useTableSearch({
    searchValue,
    data: events,
  });

  const { clouds, actions: cloudActions } = useClouds();

  console.log({clouds, cloudActions});

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

  return (
    <PanelWrapper>
      <TopItems>
        <p>{strings.clusterPage.pages.events.title()}</p>
        <p>{strings.clusterPage.pages.events.itemsAmount(events.length)}</p>
        <Settings>
          <SyncButton onClick={() => handleSync()}>
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
          <FirstCell>
            {strings.clusterPage.pages.events.table.headers.type()}
          </FirstCell>
          <TableCell>
            {strings.clusterPage.pages.events.table.headers.date()}
          </TableCell>
          <TableMessageCell isHeader>
            {strings.clusterPage.pages.events.table.headers.message()}
          </TableMessageCell>
          <TableCell>
            {strings.clusterPage.pages.events.table.headers.source()}
          </TableCell>
          <TableCell>
            {strings.clusterPage.pages.events.table.headers.machine()}
          </TableCell>
          <TableCell>
            {strings.clusterPage.pages.events.table.headers.count()}
          </TableCell>
        </TableHead>
        {getFilteredData().map((event) => (
          <TableRow key={event.metadata.name}>
            <FirstCell>{event.spec.type}</FirstCell>
            <TableCell>{formatDate(clusterEntity.spec.createdAt)}</TableCell>
            <TableMessageCell isWarning={event.spec.type === 'Warning'}>
              {event.spec.message}
            </TableMessageCell>
            <TableCell>{event.metadata.source}</TableCell>
            <TableCell>5</TableCell>
            <TableCell>{event.spec.count}</TableCell>
          </TableRow>
        ))}
      </Table>
    </PanelWrapper>
  );
};

EventsPanel.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
