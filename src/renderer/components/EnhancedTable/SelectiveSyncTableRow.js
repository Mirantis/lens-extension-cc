import PropTypes from 'prop-types';
import { useState } from 'react';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';
import { AdditionalInfoRows } from './AdditionalInfoRows';
import { TriStateCheckbox } from '../TriStateCheckbox/TriStateCheckbox';

const { Component } = Renderer;

const EnhRowsWrapper = styled.div`
  display: contents;
`;

const EnhTableRow = styled.tr`
  background-color: ${({ isTopLevel }) =>
    isTopLevel ? 'var(--layoutTabsBackground)' : 'var(--mainBackground)'};
`;

const EnhTableRowCell = styled.td`
  width: 50% !important;
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
    display: flex;
    align-items: center;
  `}
`;

const EnhCollapseBtn = styled.button`
  background: transparent;
  cursor: pointer;
  margin-right: ${layout.grid * 1.5}px;
`;

const expandIconStyles = {
  color: 'var(--textColorPrimary)',
  fontSize: 'calc(var(--font-size) * 1.8)',
};

export const SelectiveSyncTableRow = ({
  extendedCloud,
  checkboxesStateObj,
  onChangeHandler,
  parentCheckboxValue,
  childrenCheckboxValue,
}) => {

  const [isOpenFirstLevel, setIsOpenFirstLevel] = useState(false);
  const [openedSecondLevelListIndex, setOpenedSecondLevelListIndex] = useState([]);
  const [сheckboxesState, setCheckboxesState] = useState({
    parent: false,
    children: checkboxesStateObj(extendedCloud),
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

  return (
    <>
      <EnhTableRow isTopLevel>
        <EnhTableRowCell isBigger withCheckboxes>
          <EnhCollapseBtn
            onClick={() => setIsOpenFirstLevel(!isOpenFirstLevel)}
          >
            {isOpenFirstLevel ? (
              <Component.Icon material="expand_more" style={expandIconStyles} />
            ) : (
              <Component.Icon
                material="chevron_right"
                style={expandIconStyles}
              />
            )}
          </EnhCollapseBtn>
          <TriStateCheckbox
            label={extendedCloud.cloud.name}
            onChange={() => onChangeHandler(false, сheckboxesState, setCheckboxesState)}
            value={parentCheckboxValue(сheckboxesState)}
          />
        </EnhTableRowCell>
        <EnhTableRowCell>{extendedCloud.cloud.cloudUrl}</EnhTableRowCell>
      </EnhTableRow>
      {isOpenFirstLevel &&
        (extendedCloud?.namespaces || []).map((namespace, index) => (
          <EnhRowsWrapper key={namespace.name}>
            <EnhTableRow>
              <EnhTableRowCell isFirstLevel withCheckboxes>
                <EnhCollapseBtn onClick={() => setOpenedList(index)}>
                  {openedSecondLevelListIndex.includes(index) ? (
                    <Component.Icon
                      material="expand_more"
                      style={expandIconStyles}
                    />
                  ) : (
                    <Component.Icon
                      material="chevron_right"
                      style={expandIconStyles}
                    />
                  )}
                </EnhCollapseBtn>
                <TriStateCheckbox
                  label={namespace.name}
                  value={childrenCheckboxValue(namespace.name, сheckboxesState)}
                  onChange={() => onChangeHandler(namespace.name, сheckboxesState, setCheckboxesState)}
                />
              </EnhTableRowCell>
              <EnhTableRowCell />
            </EnhTableRow>

            {openedSecondLevelListIndex.includes(index) && (
              <AdditionalInfoRows namespace={namespace} emptyCellsCount={1} />
            )}
          </EnhRowsWrapper>
        ))}
    </>
  );
};

SelectiveSyncTableRow.propTypes = {
  extendedCloud: PropTypes.object.isRequired,
  checkboxesStateObj: PropTypes.func.isRequired,
  onChangeHandler: PropTypes.func.isRequired,
  parentCheckboxValue: PropTypes.func.isRequired,
  childrenCheckboxValue: PropTypes.func.isRequired,
};
