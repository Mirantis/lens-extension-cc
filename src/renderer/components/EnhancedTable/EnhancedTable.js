import PropTypes from 'prop-types';
import { useState } from 'react';
import styled from '@emotion/styled';
import Box from '@material-ui/core/Box';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import { EnhancedTableHead } from './EnhancedTableHead';
import { EnhancedTableRow } from './EnhancedTableRow';

function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

// This method is created for cross-browser compatibility, if you don't
// need to support IE11, you can use Array.prototype.sort() directly
function stableSort(array, comparator) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) {
      return order;
    }
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

const EnhPaper = styled(Paper)`
  box-shadow: none;
  background-color: transparent;
  width: 100%;
`;

const EnhTable = styled(Table)`
  border: 1px solid var(--inputControlBorder);
  border-radius: 5px;
  border-collapse: inherit;
  overflow: hidden;
`;

const EnhTableCell = styled(TableCell)`
  border: 0;
  font-size: var(--font-size);
  line-height: normal;
  color: var(--textColorPrimary);
  padding: 6px 18px;
`;

export const EnhancedTable = ({ extClouds }) => {
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('url');

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  return (
    <Box>
      <EnhPaper>
        <TableContainer>
          <EnhTable size="medium">
            <EnhancedTableHead
              order={order}
              orderBy={orderBy}
              onRequestSort={handleRequestSort}
            />
            <TableBody>
              {stableSort(
                Object.keys(extClouds),
                getComparator(order, orderBy)
              ).map((url) => {
                return <EnhancedTableRow key={url} row={extClouds[url]} />;
              })}
              <TableRow
                style={{
                  height: 53,
                  backgroundColor: 'var(--mainBackground)',
                }}
              >
                <EnhTableCell colSpan={6} />
              </TableRow>
            </TableBody>
          </EnhTable>
        </TableContainer>
      </EnhPaper>
    </Box>
  );
};

EnhancedTable.propTypes = {
  extClouds: PropTypes.object.isRequired,
};
