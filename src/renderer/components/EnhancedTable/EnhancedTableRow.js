import PropTypes from 'prop-types';
import { useState } from 'react';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';
import { AdditionalInfoRows } from './AdditionalInfoRows';
import { connectionStatuses } from '../../../strings';

const { Icon } = Renderer.Component;

const EnhRowsWrapper = styled.div`
  display: contents;
`;

const EnhTableRow = styled.tr`
  background-color: ${({ isTopLevel }) =>
    isTopLevel ? 'var(--layoutTabsBackground)' : 'var(--mainBackground)'};
`;

const EnhTableRowCell = styled.td`
  width: ${({ isBigger }) => isBigger && '40%'};
  border: 0;
  font-size: var(--font-size);
  line-height: normal;
  color: var(--textColorPrimary);
  padding: ${layout.grid * 1.5}px ${layout.grid * 4.5}px;

  ${({ isFirstLevel }) =>
    isFirstLevel &&
    `
    padding-left: ${layout.grid * 11}px;
  `}

  ${({ isRightAligned }) =>
    isRightAligned &&
    `
    text-align: right;
  `}
`;

const EnhCollapseBtn = styled.button`
  background: transparent;
  cursor: pointer;
  margin-right: ${layout.grid * 1.5}px;
  transform: translateY(-2px);
`;

const EnhMoreButton = styled.button`
  background: transparent;
  cursor: pointer;
`;

const expandIconStyles = {
  color: 'var(--textColorPrimary)',
  fontSize: 'calc(var(--font-size) * 1.8)',
};

const moreInfoIconStyles = {
  color: 'var(--textColorPrimary)',
  fontSize: 'calc(var(--font-size) * 1.5)',
};

/**
 * @param {Cloud} cloud
 * @return {{cloudStatus: string, namespaceStatus: string}}
 */
const getStatus = (cloud) => {
  return cloud.isConnected()
    ? {
        cloudStatus: connectionStatuses.cloud.connected(),
        namespaceStatus: connectionStatuses.namespace.connected(),
      }
    : {
        cloudStatus: connectionStatuses.cloud.disconnected(),
        namespaceStatus: connectionStatuses.namespace.disconnected(),
      };
};

export const EnhancedTableRow = ({ row }) => {
  const [isOpenFirstLevel, setIsOpenFirstLevel] = useState(false);
  const [openedSecondLevelListIndex, setOpenedSecondLevelListIndex] = useState(
    []
  );

  const setOpenedList = (index) => {
    if (openedSecondLevelListIndex.includes(index)) {
      setOpenedSecondLevelListIndex(
        openedSecondLevelListIndex.filter((rowIndex) => rowIndex !== index)
      );
    } else {
      setOpenedSecondLevelListIndex([...openedSecondLevelListIndex, index]);
    }
  };

  const { cloudStatus, namespaceStatus } = getStatus(row.cloud);

  return (
    <>
      <EnhTableRow isTopLevel>
        <EnhTableRowCell isBigger>
          <EnhCollapseBtn
            onClick={() => setIsOpenFirstLevel(!isOpenFirstLevel)}
          >
            {isOpenFirstLevel ? (
              <Icon material="expand_more" style={expandIconStyles} />
            ) : (
              <Icon material="chevron_right" style={expandIconStyles} />
            )}
          </EnhCollapseBtn>
          {row.cloud.name}
        </EnhTableRowCell>
        <EnhTableRowCell>{row.cloud.cloudUrl}</EnhTableRowCell>
        <EnhTableRowCell>{row.cloud.username}</EnhTableRowCell>
        <EnhTableRowCell>{cloudStatus}</EnhTableRowCell>
        <EnhTableRowCell isRightAligned>
          <EnhMoreButton>
            <Icon material="more_vert" style={moreInfoIconStyles} />
          </EnhMoreButton>
        </EnhTableRowCell>
      </EnhTableRow>
      {isOpenFirstLevel &&
        (row?.namespaces || []).map((namespace, index) => (
          <EnhRowsWrapper key={namespace.name}>
            <EnhTableRow>
              <EnhTableRowCell isFirstLevel>
                <EnhCollapseBtn onClick={() => setOpenedList(index)}>
                  {openedSecondLevelListIndex.includes(index) ? (
                    <Icon material="expand_more" style={expandIconStyles} />
                  ) : (
                    <Icon material="chevron_right" style={expandIconStyles} />
                  )}
                </EnhCollapseBtn>
                {namespace.name}
              </EnhTableRowCell>
              <EnhTableRowCell />
              <EnhTableRowCell />
              <EnhTableRowCell>{namespaceStatus}</EnhTableRowCell>
              <EnhTableRowCell isRightAligned>
                <EnhMoreButton>
                  <Icon material="more_vert" style={moreInfoIconStyles} />
                </EnhMoreButton>
              </EnhTableRowCell>
            </EnhTableRow>

            {openedSecondLevelListIndex.includes(index) && (
              <AdditionalInfoRows namespace={namespace} />
            )}
          </EnhRowsWrapper>
        ))}
    </>
  );
};

EnhancedTableRow.propTypes = {
  row: PropTypes.object.isRequired,
};
