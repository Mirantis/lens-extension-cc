import propTypes from 'prop-types';
import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/css';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../../styles';
import * as strings from '../../../../strings';
import { CONNECTION_STATUSES } from '../../../../common/Cloud';
import { formatDate } from '../../../rendererUtil';
import { apiKinds } from '../../../../api/apiConstants';
import { useCloudSync } from '../useCloudSync';
import { useTableSearch } from '../useTableSearch';
import { handleCloudSync } from '../clusterPageUtil';
import { ItemsTable } from '../ItemsTable';

const TABLE_HEADER_IDS = {
  STATUS: 'status',
  DATE: 'date',
  NAME: 'name',
  MESSAGE: 'message',
  MACHINE: 'machine',
  FROM_RELEASE: 'from-release',
  TO_RELEASE: 'to-release',
};

const HISTORY_STATUSES = {
  IN_PROGRESS: 'in progress',
  SUCCESS: 'success',
  FAILED: 'failed',
};

const {
  Component: { Icon, SearchInput },
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
  },
  {
    id: TABLE_HEADER_IDS.MESSAGE,
    label: strings.clusterPage.pages.history.table.headers.message(),
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
  switch (status.toLowerCase()) {
    case HISTORY_STATUSES.IN_PROGRESS:
      return 'var(--colorWarning)';
    case HISTORY_STATUSES.SUCCESS:
      return 'var(--colorSuccess)';
    case HISTORY_STATUSES.FAILED:
      return 'var(--colorError)';
    default:
      return 'var(--textColorPrimary)';
  }
};

const generateItems = (history) => {
  return history.map((item) => {
    return [
      {
        text: item.spec.stages.status || unknownValue(),
        color: getStatusColor(item.spec.stages.status),
      },
      {
        text: formatDate(item.spec.stages.timeAt, false),
      },
      {
        text: item.spec.stages.name || unknownValue(),
      },
      {
        text: item.spec.stages.message || unknownValue(),
        isBiggerCell: true,
      },
      {
        text:
          item.spec.targetKind === apiKinds.MACHINE
            ? item.spec.targetName || unknownValue()
            : strings.clusterPage.common.emptyValue(),
      },
      {
        text: item.spec.fromRelease || strings.clusterPage.common.emptyValue(),
      },
      {
        text: item.spec.release || strings.clusterPage.common.emptyValue(),
      },
    ];
  });
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

const mockHistory = [
  {
    metadata: {
      cloudUrl: 'https://container-cloud.int.mirantis.com',
      name: 'name-1',
    },
    spec: {
      fromRelease: '',
      release: '',
      stages: {
        name: 'Machine deploy',
        message: 'Manager machine is being deployed on cluster scameron-aws.',
        status: 'In progress',
        timeAt: '2022-12-06T21:50:25.000Z',
      },
      targetKind: 'Machine',
      targetName: 'scameron-aws-node-xr45c_2',
    },
  },
  {
    metadata: {
      cloudUrl: 'https://container-cloud.int.mirantis.com',
      name: 'name-2',
    },
    spec: {
      fromRelease: '',
      release: '',
      stages: {
        name: 'Machine deploy',
        message: 'Manager machine is being deployed on cluster scameron-aws. ',
        status: 'Not started',
        timeAt: '2022-11-06T21:50:25.000Z',
      },
      targetKind: 'Machine',
      targetName: 'scameron-aws-node-xr45c_3',
    },
  },
  {
    metadata: {
      cloudUrl: 'https://container-cloud.int.mirantis.com',
      name: 'name-3',
    },
    spec: {
      fromRelease: '8.10.0+2.1.0',
      release: '11.4.0+3.5.4',
      stages: {
        name: 'Cluster upgrade',
        message: 'Cluster scameron-aws was upgraded successfully. ',
        status: 'Success',
        timeAt: '2022-09-06T21:50:25.000Z',
      },
      targetKind: 'Cluster',
      targetName: 'scameron-aws',
    },
  },
  {
    metadata: {
      cloudUrl: 'https://container-cloud.int.mirantis.com',
      name: 'name-4',
    },
    spec: {
      fromRelease: '',
      release: '8.10.0+2.1.0',
      stages: {
        name: 'CLuster install',
        message: 'Failed to set cluster scameron-aws in maintenance mode.',
        status: 'Failed',
        timeAt: '2022-10-06T21:50:25.000Z',
      },
      targetKind: 'Cluster',
      targetName: 'scameron-aws',
    },
  },
];

export const HistoryPanel = ({ clusterEntity }) => {
  const history = mockHistory;
  const targetRef = useRef();

  const [isLoading, setIsLoading] = useState(false);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [isFiltered, setIsFiltered] = useState(false);
  const [topBarHeight, setTopBarHeight] = useState(0);

  const { searchResults } = useTableSearch({
    searchText: filters.searchText,
    searchItems: history,
  });

  const { isCloudFetching, cloudStatus } = useCloudSync(
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
          ? a.spec.stages.status.localeCompare(b.spec.stages.status)
          : b.spec.stages.status.localeCompare(a.spec.stages.status);
      }
      if (filters.sort.sortBy === TABLE_HEADER_IDS.DATE) {
        return filters.sort.isAsc
          ? a.spec.stages.timeAt.localeCompare(b.spec.stages.timeAt)
          : b.spec.stages.timeAt.localeCompare(a.spec.stages.timeAt);
      }
      if (filters.sort.sortBy === TABLE_HEADER_IDS.NAME) {
        return filters.sort.isAsc
          ? a.spec.stages.name.localeCompare(b.spec.stages.name)
          : b.spec.stages.name.localeCompare(a.spec.stages.name);
      }
      if (filters.sort.sortBy === TABLE_HEADER_IDS.MACHINE) {
        return filters.sort.isAsc
          ? a.spec.targetName.localeCompare(b.spec.targetName)
          : b.spec.targetName.localeCompare(a.spec.targetName);
      }
      if (filters.sort.sortBy === TABLE_HEADER_IDS.FROM_RELEASE) {
        return filters.sort.isAsc
          ? a.spec.fromRelease.localeCompare(b.spec.fromRelease)
          : b.spec.fromRelease.localeCompare(a.spec.fromRelease);
      }
      if (filters.sort.sortBy === TABLE_HEADER_IDS.TO_RELEASE) {
        return filters.sort.isAsc
          ? a.spec.release.localeCompare(b.spec.release)
          : b.spec.release.localeCompare(a.spec.release);
      }
    });

    setFilteredHistory(sortedHistory);

    if (filters.searchText) {
      setIsFiltered(true);
    } else {
      setIsFiltered(false);
    }
  }, [filters, searchResults]);

  const syncCloud = useCallback(
    () => handleCloudSync(clusterEntity.metadata.cloudUrl),
    [clusterEntity.metadata.cloudUrl]
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
        <p>{strings.clusterPage.pages.history.title()}</p>
        <p>
          {strings.clusterPage.pages.history.itemsAmount(
            filteredHistory.length
          )}
        </p>
        <Settings>
          <SyncButton
            isDisabled={
              isCloudFetching || cloudStatus !== CONNECTION_STATUSES.CONNECTED
            }
            isCloudFetching={isCloudFetching}
            onClick={syncCloud}
          >
            <Icon material="refresh" />
          </SyncButton>
          <Search
            placeholder={strings.clusterPage.pages.history.searchPlaceholder()}
            value={filters.searchText}
            onInput={handleSearchChange}
          />
        </Settings>
      </TopItems>
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
    </PanelWrapper>
  );
};

HistoryPanel.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
