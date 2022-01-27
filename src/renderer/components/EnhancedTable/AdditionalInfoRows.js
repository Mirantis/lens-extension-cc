import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { layout } from '../styles';
import { managementClusters } from '../../../strings';

const EnhTableRow = styled.tr`
  &:nth-of-type(odd) {
    background-color: var(--layoutTabsBackground);
  }

  &:nth-of-type(even) {
    background-color: var(--mainBackground);
  }
`;

const EnhTableCell = styled.td`
  width: ${({ isBigger }) => isBigger && '40%'};
  border: 0;
  font-size: var(--font-size);
  line-height: normal;
  color: var(--textColorPrimary);
  padding: ${layout.grid * 1.5}px ${layout.grid * 4.5}px ${layout.grid * 1.5}px
    ${layout.grid * 24}px;
`;

const generateTableCells = (amount) => {
  const keysArr = Array(amount)
    .fill(null)
    .map((_, i) => i);
  return keysArr.map((key) => <EnhTableCell key={key}></EnhTableCell>);
};

export const AdditionalInfoRows = ({ namespace }) => {
  const listOfInfo = [
    {
      infoName: managementClusters.table.tbodyDetailedInfo.clusters(),
      infoCount: namespace.clustersCount,
    },
    {
      infoName: managementClusters.table.tbodyDetailedInfo.sshKeys(),
      infoCount: namespace.sshKeysCount,
    },
    {
      infoName: managementClusters.table.tbodyDetailedInfo.credentials(),
      infoCount: namespace.credentials.allCredentialsCount,
    },
  ];
  return (
    <div style={{ display: 'contents' }}>
      {listOfInfo.map(({ infoName, infoCount }) => (
        <EnhTableRow key={infoName}>
          <EnhTableCell isBigger>
            {infoName} ({infoCount})
          </EnhTableCell>
          {generateTableCells(4)}
        </EnhTableRow>
      ))}
    </div>
  );
};

AdditionalInfoRows.propTypes = {
  namespace: PropTypes.object.isRequired,
};
