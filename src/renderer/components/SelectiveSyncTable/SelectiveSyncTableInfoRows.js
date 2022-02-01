import PropTypes from 'prop-types';
import _ from 'lodash';
import styled from '@emotion/styled';
import { layout } from '../styles';
import { managementClusters } from '../../../strings';

const EnhInfoRowsWrapper = styled.div`
  display: contents;
`;

const EnhTableInfoRow = styled.tr`
  &:nth-of-type(odd) {
    background-color: var(--layoutTabsBackground);
  }

  &:nth-of-type(even) {
    background-color: var(--mainBackground);
  }
`;

const EnhTableInfoRowCell = styled.td`
  width: 50% !important;
  border: 0;
  font-size: var(--font-size);
  line-height: normal;
  color: var(--textColorPrimary);
  padding: ${layout.grid * 1.5}px ${layout.grid * 4.5}px ${layout.grid * 1.5}px
    ${layout.grid * 24}px;
`;

const generateTableCells = (amount) => {
  return _.times(amount).map((key) => <EnhTableInfoRowCell key={key} />);
};

export const SelectiveSyncTableInfoRows = ({ namespace }) => {
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
    <EnhInfoRowsWrapper>
      {listOfInfo.map(({ infoName, infoCount }) => (
        <EnhTableInfoRow key={infoName}>
          <EnhTableInfoRowCell>
            {infoName} ({infoCount})
          </EnhTableInfoRowCell>
          {generateTableCells(1)}
        </EnhTableInfoRow>
      ))}
    </EnhInfoRowsWrapper>
  );
};

SelectiveSyncTableInfoRows.propTypes = {
  namespace: PropTypes.object.isRequired,
};
