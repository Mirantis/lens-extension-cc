import PropTypes from 'prop-types';
import { useState } from 'react';
import styled from '@emotion/styled';
import { layout } from '../styles';
import { EnhancedTableHead } from './EnhancedTableHead';
import { HOCWithCheckboxes } from '../HOC/hocWithCheckboxes';
import { getTableData, sortData } from './utils';
import { EnhancedTableRow } from './EnhancedTableRow';

const SelectiveSyncTableItem = styled.table`
  width: 100%;
  border-collapse: inherit;
  border-spacing: unset;
  background-color: var(--mainBackground);
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

export const EnhancedTable = ({ extendedClouds, isSelectiveSyncView }) => {
  const { path, headCellValue } = getTableData(isSelectiveSyncView);
  const [sortedBy, setSortedBy] = useState(headCellValue.NAME);
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

    setSortedBy(value ? value : headCellValue.NAME);
  };

  const getComponent = (url) => {
    const key = `${url}-${isSelectiveSyncView ? 'selective' : ''}`;
    const comp = (
      <EnhancedTableRow
        key={key}
        extendedCloud={extendedClouds[url]}
        withCheckboxes={isSelectiveSyncView}
      />
    );
    return isSelectiveSyncView ? (
      <HOCWithCheckboxes key={`${key}-hoc`} Component={comp} />
    ) : (
      comp
    );
  };

  return (
    <SelectiveSyncTableItem>
      <EnhancedTableHead sortBy={sortBy} values={headCellValue} />
      <tbody>
        {sortData(extendedClouds, sortedBy, order, path).map(getComponent)}
        <tr style={emptyRowStyles}>
          <SelectiveSyncTableCell colSpan={6} />
        </tr>
      </tbody>
    </SelectiveSyncTableItem>
  );
};

EnhancedTable.propTypes = {
  extendedClouds: PropTypes.object.isRequired,
  isSelectiveSyncView: PropTypes.bool,
};

EnhancedTable.defaultProps = {
  isSelectiveSyncView: false,
};
