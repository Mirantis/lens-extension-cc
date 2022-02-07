import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';
import { managementClusters } from '../../../strings';

const { Component } = Renderer;

const EnhTableHead = styled.thead`
  background-color: var(--mainBackground);
`;

const EnhTableHeadCell = styled.th`
  text-align: left;
  border: 0;
  font-size: var(--font-size);
  line-height: normal;
  color: var(--textColorPrimary);
  padding: ${layout.grid * 3.5}px ${layout.grid * 4.5}px;
`;

const EnhSortButton = styled.button`
  font-size: var(--font-size);
  font-weight: bold;
  color: var(--textColorAccent);
  background: transparent;
  cursor: pointer;
`;

const sortButtonStyles = {
  color: 'var(--textColorPrimary)',
  fontSize: 'calc(var(--font-size) * 1.5)',
  marginLeft: layout.grid,
};

export const EnhancedTableHead = ({ sortBy, values }) => {
  const headerCells = Object.keys(values).map((key) => ({
    label: managementClusters.table.thead[key.toLowerCase()](),
    key: key,
  }));

  return (
    <EnhTableHead>
      <tr>
        {headerCells.map(({ label, key }) => (
          <EnhTableHeadCell key={key}>
            <EnhSortButton onClick={() => sortBy(key)}>
              {label}
              <Component.Icon
                material="arrow_drop_down"
                style={sortButtonStyles}
              />
            </EnhSortButton>
          </EnhTableHeadCell>
        ))}
      </tr>
    </EnhTableHead>
  );
};

EnhancedTableHead.propTypes = {
  sortBy: PropTypes.func.isRequired,
  values: PropTypes.object.isRequired,
};
