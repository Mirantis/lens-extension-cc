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
  border: 0;
  font-size: var(--font-size);
  line-height: normal;
  color: var(--textColorPrimary);
  padding: ${layout.grid * 1.5}px ${layout.grid * 4.5}px;
  padding-left: ${({ isFirst }) =>
    isFirst ? `${layout.grid * 24}px` : `${layout.grid * 4.5}px`};
`;

const generateTableCells = (amount) => {
  if (!amount) {
    return;
  }
  return _.times(amount).map((key) => <EnhTableInfoRowCell key={key} />);
};

export const AdditionalInfoRows = ({ namespace, emptyCellsCount }) => {
  const listOfInfo = [
    {
      infoName: managementClusters.table.tbodyDetailedInfo.clusters(),
      infoCount: namespace.clusterCount,
    },
    {
      infoName: managementClusters.table.tbodyDetailedInfo.sshKeys(),
      infoCount: namespace.sshKeyCount,
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
          <EnhTableInfoRowCell isFirst>
            {infoName} ({infoCount})
          </EnhTableInfoRowCell>
          {generateTableCells(emptyCellsCount)}
        </EnhTableInfoRow>
      ))}
    </EnhInfoRowsWrapper>
  );
};

AdditionalInfoRows.propTypes = {
  namespace: PropTypes.object.isRequired,
  emptyCellsCount: PropTypes.number,
};

AdditionalInfoRows.defaultProps = {
  emptyCellsCount: 0,
};
