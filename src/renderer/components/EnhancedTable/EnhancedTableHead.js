import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableSortLabel from '@material-ui/core/TableSortLabel';

const headCells = [
  {
    id: 'name',
    numeric: false,
    disablePadding: true,
    label: 'Name',
  },
  {
    id: 'url',
    numeric: true,
    disablePadding: false,
    label: 'URL',
  },
  {
    id: 'username',
    numeric: true,
    disablePadding: false,
    label: 'Username',
  },
  {
    id: 'status',
    numeric: true,
    disablePadding: false,
    label: 'Status',
  },
];

const EnhTableHead = styled(TableHead)`
  background-color: var(--mainBackground);
`;

const EnhTableCell = styled(TableCell)`
  border: 0;
  font-size: var(--font-size);
  line-height: normal;
  color: var(--textColorPrimary);
  padding: 14px 18px;

  span,
  svg {
    color: var(--textColorPrimary) !important;
  }

  svg {
    opacity: 1 !important;
  }
`;

export const EnhancedTableHead = (props) => {
  const { order, orderBy, onRequestSort } = props;
  const createSortHandler = (property) => (event) => {
    onRequestSort(property, event);
  };

  return (
    <EnhTableHead>
      <TableRow>
        {headCells.map((headCell) => (
          <EnhTableCell
            key={headCell.id}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : 'asc'}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
            </TableSortLabel>
          </EnhTableCell>
        ))}
        <EnhTableCell></EnhTableCell>
      </TableRow>
    </EnhTableHead>
  );
};

EnhancedTableHead.propTypes = {
  onRequestSort: PropTypes.func.isRequired,
  order: PropTypes.oneOf(['asc', 'desc']).isRequired,
  orderBy: PropTypes.string.isRequired,
};
