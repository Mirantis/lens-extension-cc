import PropTypes from 'prop-types';
import { useState } from 'react';
import { get, orderBy } from 'lodash';
import styled from '@emotion/styled';
import { layout } from '../styles';
import { EnhancedTableHead } from './EnhancedTableHead';
import { SelectiveSyncTableRow } from './SelectiveSyncTableRow';

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

const HEAD_CELL_VALUES = {
  NAME: 'Name',
  URL: 'URL',
};

const pathToData = {
  [HEAD_CELL_VALUES.NAME]: ['cloud', 'name'],
  [HEAD_CELL_VALUES.URL]: ['cloud', 'cloudUrl'],
};

// const sortData = (obj, sortBy, order) => {
//   const sortByValueArr = Object.keys(obj).map((key) => {
//     return { [key]: get(obj[key], pathToData[sortBy]) };
//   });

//   const sorted = orderBy(sortByValueArr, Object.keys(obj), [order]);

//   return sorted.map((a) => Object.keys(a));
// };

export const SelectiveSyncTable = ({
  mockedExtendedClouds,
  checkboxesStateObj,
  onChangeHandler,
  parentCheckboxValue,
  childrenCheckboxValue,
  sortData,
}) => {
  const [sortedBy, setSortedBy] = useState(HEAD_CELL_VALUES.NAME);
  const [order, setOrder] = useState('asc');

  const extendedClouds = mockedExtendedClouds;

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
      <EnhancedTableHead sortBy={sortBy} values={HEAD_CELL_VALUES} />
      <tbody>
        {sortData(extendedClouds, sortedBy, order, pathToData).map((url) => {
          return <SelectiveSyncTableRow
            key={url}
            extendedCloud={extendedClouds[url]}
            checkboxesStateObj={checkboxesStateObj}
            onChangeHandler={onChangeHandler}
            parentCheckboxValue={parentCheckboxValue}
            childrenCheckboxValue={childrenCheckboxValue}
          />;
        })}
        <tr style={emptyRowStyles}>
          <SelectiveSyncTableCell colSpan={6} />
        </tr>
      </tbody>
    </SelectiveSyncTableItem>
  );
};

SelectiveSyncTable.propTypes = {
  mockedExtendedClouds: PropTypes.object.isRequired,
  checkboxesStateObj: PropTypes.func,
  onChangeHandler: PropTypes.func,
  parentCheckboxValue: PropTypes.func,
  childrenCheckboxValue: PropTypes.func,
  sortData: PropTypes.func,
};

SelectiveSyncTable.defaultProps = {
  checkboxesStateObj: null,
  onChangeHandler: null,
  parentCheckboxValue: null,
  childrenCheckboxValue: null,
  sortData: null,
};
