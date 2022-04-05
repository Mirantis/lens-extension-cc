import PropTypes from 'prop-types';
import { useState } from 'react';
import styled from '@emotion/styled';
import { layout } from '../styles';
import { EnhancedTableHead } from './EnhancedTableHead';
import { getTableData, sortData } from './tableUtil';
import { TableRowListenerWrapper } from './TableRowListenerWrapper';

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

export const EnhancedTable = ({
  clouds,
  isSelectiveSyncView,
  isSyncStarted,
  getDataToSync,
}) => {
  const { path, headCellValue } = getTableData(isSelectiveSyncView);
  const [sortedBy, setSortedBy] = useState(headCellValue.NAME);
  const [order, setOrder] = useState('asc');

  const sortBy = (value) => {
    if (value !== sortedBy) {
      setOrder('asc');
    } else {
      order === 'asc' ? setOrder('desc') : setOrder('asc');
    }

    setSortedBy(value ? value : headCellValue.NAME);
  };

  return (
    <SelectiveSyncTableItem>
      <EnhancedTableHead
        sortBy={sortBy}
        sortedBy={sortedBy}
        order={order}
        headerValues={headCellValue}
      />
      <tbody>
        {sortData(clouds, sortedBy, order, path).map((url) => {
          const key = `${url}-${isSelectiveSyncView ? 'selective' : ''}`;
          return (
            <TableRowListenerWrapper
              key={key}
              cloud={clouds[url]}
              withCheckboxes={isSelectiveSyncView}
              isSyncStarted={isSyncStarted}
              getDataToSync={getDataToSync}
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

EnhancedTable.propTypes = {
  clouds: PropTypes.object.isRequired,
  isSelectiveSyncView: PropTypes.bool,
  isSyncStarted: PropTypes.bool.isRequired,
  getDataToSync: PropTypes.func,
};

EnhancedTable.defaultProps = {
  isSelectiveSyncView: false,
  getDataToSync: null,
};
