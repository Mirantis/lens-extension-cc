import PropTypes from 'prop-types';
import { useState } from 'react';
import _ from 'lodash';
import styled from '@emotion/styled';
import { layout } from '../styles';
import { EnhancedTableHead } from './EnhancedTableHead';
import { EnhancedTableRow } from './EnhancedTableRow';
import { managementClusters } from '../../../strings';

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
  NAME: managementClusters.table.thead.name(),
  URL: managementClusters.table.thead.url(),
  USERNAME: managementClusters.table.thead.username(),
  STATUS: managementClusters.table.thead.status(),
};

const pathToData = {
  [HEAD_CELL_VALUES.NAME]: ['cloud', 'name'],
  [HEAD_CELL_VALUES.URL]: ['cloud', 'cloudUrl'],
  [HEAD_CELL_VALUES.USERNAME]: ['cloud', 'username'],
};

const sortData = (obj, sortBy, orderBy) => {
  const sortByValueArr = Object.keys(obj).map((key) => {
    return { [key]: _.get(obj[key], pathToData[sortBy]) };
  });

  const sorted = _.orderBy(sortByValueArr, Object.keys(obj), [orderBy]);

  return sorted.map((a) => Object.keys(a));
};

export const EnhancedTable = ({ extClouds }) => {
  const [sortedBy, setSortedBy] = useState(HEAD_CELL_VALUES.NAME);
  const [orderBy, setOrderBy] = useState('asc');

  const sortBy = (value) => {
    if (value === sortedBy && orderBy === 'asc') {
      setOrderBy('desc');
    } else if (value === sortedBy && orderBy === 'desc') {
      setOrderBy('asc');
    }

    if (value !== sortedBy) {
      setOrderBy('asc');
    }

    setSortedBy(value ? value : HEAD_CELL_VALUES.NAME);
  };

  return (
    <EnhTable>
      <EnhancedTableHead sortBy={sortBy} />
      <tbody>
        {sortData(extClouds, sortedBy, orderBy).map((url) => {
          return <EnhancedTableRow key={url} row={extClouds[url]} />;
        })}
        <tr style={emptyRowStyles}>
          <EnhTableCell colSpan={6} />
        </tr>
      </tbody>
    </EnhTable>
  );
};

EnhancedTable.propTypes = {
  extClouds: PropTypes.object.isRequired,
};
