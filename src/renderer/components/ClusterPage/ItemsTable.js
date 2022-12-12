import propTypes from 'prop-types';
import { useMemo } from 'react';
import { Renderer } from '@k8slens/extensions';
import styled from '@emotion/styled';
import { layout } from '../styles';
import * as strings from '../../../strings';

const {
  Component: { Icon, Spinner, Table, TableHead, TableRow, TableCell },
} = Renderer;

const MESSAGE_CELL_ID = 'message';
const getTableRowStyles = (topBarHeight) => {
  return {
    height: `calc(100% - ${topBarHeight}px)`,
    justifyContent: 'center',
    alignItems: 'center',
  };
};

//
// INTERNAL STYLED COMPONENTS
//

const FullHeightTable = styled(Table)((props) => ({
  height: `calc(100% - ${props.heightForReduce}px)`,
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

const TableCellWithPadding = styled(TableCell)((props) => ({
  paddingTop: layout.grid * 2.5,
  paddingBottom: layout.grid * 2.5,
  wordBreak: 'normal',

  '&&&': {
    flexGrow: props.isBiggerCell ? 3 : 1,
  },
}));

const TableMessageCell = styled.div`
  display: flex;
  align-items: center;
  flex: 3 0;
  padding: ${layout.grid * 2.5}px ${layout.pad}px;
  line-height: 1;
  color: 'var(--tableHeaderColor)';
`;

const SortButton = styled.button`
  display: flex;
  align-items: center;
  text-align: left;

  i {
    opacity: ${({ isActive }) => (isActive ? '1' : '0.5')};
    transform: ${({ isAsc, isActive }) =>
      isAsc && isActive ? 'rotate(180deg)' : 'rotate(0deg)'};
  }
`;

//
// MAIN COMPONENT
//

export const ItemsTable = ({
  tableHeaders,
  items,
  onSortChange,
  onResetSearch,
  sort,
  isFiltered,
  isLoading,
  topBarHeight,
  noItemsFoundMessage,
  emptyListMessage,
}) => {
  const tableRowStyles = useMemo(
    () => getTableRowStyles(topBarHeight),
    [topBarHeight]
  );

  return (
    <FullHeightTable heightForReduce={topBarHeight}>
      <Spinner />
      <TableHead sticky showTopLine>
        {tableHeaders.map((header, index) => {
          if (header.id === MESSAGE_CELL_ID) {
            return (
              <TableMessageCell key={header.id}>
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
        <TableRow style={tableRowStyles}>
          <Spinner />
        </TableRow>
      ) : items.length > 0 ? (
        items.map((item, rowIndex) => (
          <TableRow key={rowIndex}>
            {item.map((singleItem, itemIndex) => (
              <TableCellWithPadding
                key={itemIndex}
                isBiggerCell={singleItem.isBiggerCell}
                style={{
                  color: singleItem.color || 'var(--textColorPrimary)',
                }}
              >
                {itemIndex === 0 && <FirstCellUiReformer></FirstCellUiReformer>}
                {singleItem.text}
              </TableCellWithPadding>
            ))}
          </TableRow>
        ))
      ) : (
        <TableRow style={tableRowStyles}>
          {isFiltered ? (
            <NoItemsMessageWrapper>
              <p>{noItemsFoundMessage}</p>
              <ResetFiltersButton onClick={() => onResetSearch()}>
                {strings.clusterPage.common.resetSearch()}
              </ResetFiltersButton>
            </NoItemsMessageWrapper>
          ) : (
            <p>{emptyListMessage}</p>
          )}
        </TableRow>
      )}
    </FullHeightTable>
  );
};

ItemsTable.propTypes = {
  tableHeaders: propTypes.arrayOf(
    propTypes.shape({
      id: propTypes.string,
      label: propTypes.string,
    })
  ).isRequired,
  items: propTypes.arrayOf(propTypes.array),
  onSortChange: propTypes.func.isRequired,
  onResetSearch: propTypes.func.isRequired,
  sort: propTypes.shape({
    sortBy: propTypes.string,
    isAsc: propTypes.bool,
  }).isRequired,
  isFiltered: propTypes.bool.isRequired,
  isLoading: propTypes.bool.isRequired,
  topBarHeight: propTypes.number.isRequired,
  noItemsFoundMessage: propTypes.string.isRequired,
  emptyListMessage: propTypes.string.isRequired,
};
