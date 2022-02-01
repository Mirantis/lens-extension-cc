import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';
import { AdditionalInfoRows } from './AdditionalInfoRows';
import { connectionStatuses } from '../../../strings';
import { EXTENDED_CLOUD_EVENTS } from '../../../common/ExtendedCloud';

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

  ${({ withCheckboxes }) =>
    withCheckboxes &&
    `
    width: 100%;
    display: flex;
    align-items: center;
  `}
`;

const EnhCollapseBtn = styled.button`
  background: transparent;
  cursor: pointer;
  margin-right: ${layout.grid * 1.5}px;
  transform: translateY(-1px);

  ${({ withCheckboxes }) =>
    withCheckboxes &&
    `
    transform: translateY(0);
  `}
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

const colorGreen = {
  color: 'var(--colorSuccess)',
};

const colorRed = {
  color: 'var(--colorError)',
};

/**
 * @param {boolean} isCloudConnected
 * @return {{cloudStatus: string, namespaceStatus: string}}
 */
const getStatus = (isCloudConnected) => {
  return isCloudConnected
    ? {
        cloudStatus: connectionStatuses.cloud.connected(),
        namespaceStatus: connectionStatuses.namespace.connected(),
      }
    : {
        cloudStatus: connectionStatuses.cloud.disconnected(),
        namespaceStatus: connectionStatuses.namespace.disconnected(),
      };
};

export const EnhancedTableRow = ({ extendedCloud }) => {
  const [isOpenFirstLevel, setIsOpenFirstLevel] = useState(false);
  const [actualNamespaces, setActualNamespaces] = useState(
    extendedCloud.namespaces
  );
  const [openedSecondLevelListIndex, setOpenedSecondLevelListIndex] = useState(
    []
  );
  const updateNamespaces = (updatedRow) => {
    if (updatedRow) {
      setActualNamespaces(updatedRow.namespaces);
    }
  };
  useEffect(() => {
    extendedCloud.addEventListener(
      EXTENDED_CLOUD_EVENTS.DATA_UPDATED,
      updateNamespaces
    );
    return () => {
      extendedCloud.removeEventListener(
        EXTENDED_CLOUD_EVENTS.DATA_UPDATED,
        updateNamespaces
      );
    };
  });

  const setOpenedList = (index) => {
    if (openedSecondLevelListIndex.includes(index)) {
      setOpenedSecondLevelListIndex(
        openedSecondLevelListIndex.filter((rowIndex) => rowIndex !== index)
      );
    } else {
      setOpenedSecondLevelListIndex([...openedSecondLevelListIndex, index]);
    }
  };

  const isCloudConnected = extendedCloud.cloud.isConnected();
  const { cloudStatus, namespaceStatus } = getStatus(isCloudConnected);

  return (
    <>
      <EnhTableRow isTopLevel>
        <EnhTableRowCell isBigger withCheckboxes={withCheckboxes}>
          <EnhCollapseBtn
            withCheckboxes={withCheckboxes}
            onClick={() => setIsOpenFirstLevel(!isOpenFirstLevel)}
          >
            {isOpenFirstLevel ? (
              <Icon material="expand_more" style={expandIconStyles} />
            ) : (
              <Icon material="chevron_right" style={expandIconStyles} />
            )}
          </EnhCollapseBtn>
          {extendedCloud.cloud.name}
        </EnhTableRowCell>
        <EnhTableRowCell>{extendedCloud.cloud.cloudUrl}</EnhTableRowCell>
        <EnhTableRowCell>{extendedCloud.cloud.username}</EnhTableRowCell>
        <EnhTableRowCell style={isCloudConnected ? colorGreen : colorRed}>
          {cloudStatus}
        </EnhTableRowCell>
        <EnhTableRowCell isRightAligned>
          <EnhMoreButton>
            <Icon material="more_vert" style={moreInfoIconStyles} />
          </EnhMoreButton>
        </EnhTableRowCell>
      </EnhTableRow>
      {isOpenFirstLevel &&
        (actualNamespaces || []).map((namespace, index) => (
          <EnhRowsWrapper key={namespace.name}>
            <EnhTableRow>
              <EnhTableRowCell isFirstLevel withCheckboxes={withCheckboxes}>
                <EnhCollapseBtn onClick={() => setOpenedList(index)}>
                  {openedSecondLevelListIndex.includes(index) ? (
                    <Icon material="expand_more" style={expandIconStyles} />
                  ) : (
                    <Icon material="chevron_right" style={expandIconStyles} />
                  )}
                </EnhCollapseBtn>
                {withCheckboxes && (
                  <TriStateCheckbox
                    label={namespace.name}
                    value={childrenCheckboxValue(namespace.name)}
                    onChange={() => onChangeHandler(namespace.name)}
                  />
                )}
                {!withCheckboxes && namespace.name}
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
  extendedCloud: PropTypes.object.isRequired,
};
