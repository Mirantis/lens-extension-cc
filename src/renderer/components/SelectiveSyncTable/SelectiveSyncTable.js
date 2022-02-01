import PropTypes from 'prop-types';
import { useState } from 'react';
import { get, orderBy } from 'lodash';
import styled from '@emotion/styled';
import { layout } from '../styles';
import { SelectiveSyncTableHead } from './SelectiveSyncTableHead';
import { SelectiveSyncTableRow } from './SelectiveSyncTableRow';

const SelectiveSyncTableItem = styled.table`
  width: 100%;
  border-collapse: inherit;
  border-spacing: unset;
`;

const SelectiveSyncTableCell = styled.td`
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
};

const pathToData = {
  [HEAD_CELL_VALUES.NAME]: ['cloud', 'name'],
  [HEAD_CELL_VALUES.URL]: ['cloud', 'cloudUrl'],
};

const sortData = (obj, sortBy, order) => {
  const sortByValueArr = Object.keys(obj).map((key) => {
    return { [key]: get(obj[key], pathToData[sortBy]) };
  });

  const sorted = orderBy(sortByValueArr, Object.keys(obj), [order]);

  return sorted.map((a) => Object.keys(a));
};

export const SelectiveSyncTable = ({ extClouds, withCheckboxes }) => {
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
    <SelectiveSyncTableItem>
      <SelectiveSyncTableHead sortBy={sortBy} />
      <tbody>
        {sortData(extClouds, sortedBy, order).map((url) => {
          return (
            <SelectiveSyncTableRow
              key={url}
              row={extClouds[url]}
              withCheckboxes={withCheckboxes}
            />
          );
        })}
        <tr style={emptyRowStyles}>
          <SelectiveSyncTableCell colSpan={6} />
        </tr>
      </tbody>
    </SelectiveSyncTableItem>
  );
};

SelectiveSyncTable.propTypes = {
  extClouds: PropTypes.object.isRequired,
  withCheckboxes: PropTypes.bool,
};

SelectiveSyncTable.defaultProps = {
  withCheckboxes: false,
};
