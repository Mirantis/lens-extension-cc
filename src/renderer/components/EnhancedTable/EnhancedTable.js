import PropTypes from 'prop-types';
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

export const EnhancedTable = ({ extClouds }) => {
  return (
    <EnhTable>
      <EnhancedTableHead />
      <tbody>
        {Object.keys(extClouds).map((url) => {
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
