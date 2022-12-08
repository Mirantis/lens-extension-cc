import propTypes from 'prop-types';
import { Renderer } from '@k8slens/extensions';
import styled from '@emotion/styled';
import { TABLE_HEADER_IDS } from './EventsPanel';
import { layout } from '../../styles';
import { formatDate } from '../../../rendererUtil';
import { apiKinds } from '../../../../api/apiConstants';
import * as strings from '../../../../strings';

const {
  Component: { Icon, Spinner, Table, TableHead, TableRow, TableCell },
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

//
// INTERNAL STYLED COMPONENTS
//

const FullHeightTable = styled(Table)((props) => ({
  height: `calc(100% - ${props.heightForReduce}px)`, // `62px` - height of filter bar items
}));

const FirstCellUiReformer = styled.div(() => ({
  width: layout.grid * 2,
  display: 'inline-block',
}));

const NoItemsMessageWrapper = styled.div(() => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
}));

const ResetFiltersButton = styled.button(() => ({
  color: 'var(--textColorAccent)',
  borderBottom: '1px dotted',
}));

const TableCellWithPadding = styled(TableCell)(() => ({
  paddingTop: layout.grid * 2.5,
  paddingBottom: layout.grid * 2.5,
}));

const TableMessageCell = styled.div`
  display: flex;
  flex: 3 0;
  padding: ${layout.grid * 2.5}px ${layout.pad}px;
  line-height: 1;
  color: ${({ isWarning, isHeader }) =>
    isWarning
      ? 'var(--colorError)'
      : isHeader
      ? 'var(--tableHeaderColor)'
      : 'var(--textColorPrimary)'};
`;

const SortButton = styled.button`
  display: flex;
  align-items: center;

  i {
    opacity: ${({ isActive }) => (isActive ? '1' : '0.5')};
    transform: ${({ isAsc, isActive }) =>
      isAsc && isActive ? 'rotate(180deg)' : 'rotate(0deg)'};
  }
`;

//
// MAIN COMPONENT
//

export const EventsTable = ({
  tableHeaders,
  events,
  onSortChange,
  onResetSearch,
  sort,
  isFiltered,
  isLoading,
  topBarHeight,
}) => {
  return (
    <FullHeightTable heightForReduce={topBarHeight}>
      <Spinner />
      <TableHead sticky showTopLine>
        {tableHeaders.map((header, index) => {
          if (header.id === TABLE_HEADER_IDS.MESSAGE) {
            return (
              <TableMessageCell key={header.id} isHeader>
                {index === 0 && <FirstCellUiReformer></FirstCellUiReformer>}
                {header.label}
              </TableMessageCell>
            );
          } else {
            return (
              <TableCell key={header.id}>
                <SortButton
                  isActive={sort.sortBy === header.id}
                  isAsc={sort.isAsc}
                  onClick={() => onSortChange(header.id, !sort.isAsc)}
                >
                  {index === 0 && <FirstCellUiReformer></FirstCellUiReformer>}
                  {header.label}
                  <span>
                    <Icon material="arrow_drop_down" />
                  </span>
                </SortButton>
              </TableCell>
            );
          }
        })}
      </TableHead>
      {isLoading ? (
        <TableRow
          style={{
            height: `calc(100% - ${topBarHeight}px)`,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Spinner />
        </TableRow>
      ) : events.length > 0 ? (
        events.map((event) => (
          <TableRow key={event.metadata.name}>
            <TableCellWithPadding>
              <FirstCellUiReformer></FirstCellUiReformer>
              {event.spec.type || unknownValue()}
            </TableCellWithPadding>
            <TableCellWithPadding>
              {formatDate(event.spec.createdAt, false)}
            </TableCellWithPadding>
            <TableMessageCell isWarning={event.spec.type === 'Warning'}>
              {event.spec.message || unknownValue()}
            </TableMessageCell>
            <TableCellWithPadding>
              {event.metadata.source || unknownValue()}
            </TableCellWithPadding>
            <TableCellWithPadding>
              {event.spec.targetKind === apiKinds.MACHINE
                ? event.spec.targetName || unknownValue()
                : strings.clusterPage.common.emptyValue()}
            </TableCellWithPadding>
            <TableCellWithPadding>
              {event.spec.count || unknownValue()}
            </TableCellWithPadding>
          </TableRow>
        ))
      ) : (
        <TableRow
          style={{
            height: `calc(100% - ${topBarHeight}px)`,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isFiltered ? (
            <NoItemsMessageWrapper>
              <p>{strings.clusterPage.pages.events.table.noEventsFound()}</p>
              <ResetFiltersButton onClick={() => onResetSearch()}>
                {strings.clusterPage.pages.events.table.resetSearch()}
              </ResetFiltersButton>
            </NoItemsMessageWrapper>
          ) : (
            <p>{strings.clusterPage.pages.events.table.emptyList()}</p>
          )}
        </TableRow>
      )}
    </FullHeightTable>
  );
};

EventsTable.propTypes = {
  tableHeaders: propTypes.arrayOf(
    propTypes.shape({
      id: propTypes.string,
      label: propTypes.string,
    })
  ).isRequired,
  events: propTypes.arrayOf(propTypes.object),
  onSortChange: propTypes.func.isRequired,
  onResetSearch: propTypes.func.isRequired,
  sort: propTypes.shape({
    sortBy: propTypes.string,
    isAsc: propTypes.bool,
  }).isRequired,
  isFiltered: propTypes.bool.isRequired,
  isLoading: propTypes.bool.isRequired,
  topBarHeight: propTypes.number.isRequired,
};
