import PropTypes from 'prop-types';
import { useState } from 'react';
import { get, orderBy } from 'lodash';
import styled from '@emotion/styled';
import { layout } from '../styles';
import { EnhancedTableHead } from './EnhancedTableHead';
import { EnhancedTableRow } from './EnhancedTableRow';

const EnhTable = styled.table`
  width: 100%;
  border-collapse: inherit;
  border-spacing: unset;
`;

const EnhTableCell = styled.td`
  border: 0;
  font-size: var(--font-size);
  line-height: normal;
  color: var(--textColorPrimary);
  padding: ${layout.grid * 1.5}px ${layout.grid * 4.5}px;
`;

const emptyRowStyles = {
  height: layout.grid * 13.5,
  backgroundColor: 'var(--mainBackground)',
};

export const HEAD_CELL_VALUES = {
  NAME: 'Name',
  URL: 'URL',
  USERNAME: 'Username',
  STATUS: 'Status',
};

const pathToData = {
  [HEAD_CELL_VALUES.NAME]: ['cloud', 'name'],
  [HEAD_CELL_VALUES.URL]: ['cloud', 'cloudUrl'],
  [HEAD_CELL_VALUES.USERNAME]: ['cloud', 'username'],
};

const sortData = (obj, sortBy, order) => {
  const sortByValueArr = Object.keys(obj).map((key) => {
    return { [key]: get(obj[key], pathToData[sortBy]) };
  });

  const sorted = orderBy(sortByValueArr, Object.keys(obj), [order]);

  return sorted.map((a) => Object.keys(a));
};

export const EnhancedTable = ({ extendedClouds }) => {
  const [sortedBy, setSortedBy] = useState(HEAD_CELL_VALUES.NAME);
  const [order, setOrder] = useState('asc');

  const sortBy = (value) => {
    if (value === sortedBy && order === 'asc') {
      setOrder('desc');
    } else if (value === sortedBy && order === 'desc') {
      setOrder('asc');
    }

    if (value !== sortedBy) {
      setOrder('asc');
    }

    setSortedBy(value ? value : HEAD_CELL_VALUES.NAME);
  };

  return (
    <EnhTable>
      <EnhancedTableHead sortBy={sortBy} />
      <tbody>
        {sortData(extendedClouds, sortedBy, order).map((url) => {
          return <EnhancedTableRow key={url} row={extendedClouds[url]} />;
        })}
        <tr style={emptyRowStyles}>
          <EnhTableCell colSpan={6} />
        </tr>
      </tbody>
    </EnhTable>
  );
};

EnhancedTable.propTypes = {
  extendedClouds: PropTypes.object.isRequired,
};
