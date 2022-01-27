import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';
import { managementClusters } from '../../../strings';

const { Component } = Renderer;

const headCells = [
  {
    label: managementClusters.table.thead.name(),
  },
  {
    label: managementClusters.table.thead.url(),
  },
  {
    label: managementClusters.table.thead.username(),
  },
  {
    label: managementClusters.table.thead.status(),
  },
];

const EnhTableHead = styled.thead`
  background-color: var(--mainBackground);
`;

const EnhTableCell = styled.th`
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

export const EnhancedTableHead = () => {
  return (
    <EnhTableHead>
      <tr>
        {headCells.map((headCell) => (
          <EnhTableCell key={headCell.label}>
            <EnhSortButton>
              {headCell.label}
              <Component.Icon
                material="arrow_drop_down"
                style={sortButtonStyles}
              />
            </EnhSortButton>
          </EnhTableCell>
        ))}
        <EnhTableCell></EnhTableCell>
      </tr>
    </EnhTableHead>
  );
};
