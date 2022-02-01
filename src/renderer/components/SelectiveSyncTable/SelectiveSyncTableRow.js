import PropTypes from 'prop-types';
import { useState } from 'react';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';
import { SelectiveSyncTableInfoRows } from './SelectiveSyncTableInfoRows';
import {
  TriStateCheckbox,
  checkValues,
} from '../TriStateCheckbox/TriStateCheckbox';

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
  transform: translateY(-1px);

  ${({ withCheckboxes }) =>
    withCheckboxes &&
    `
    transform: translateY(0);
  `}
`;

const expandIconStyles = {
  color: 'var(--textColorPrimary)',
  fontSize: 'calc(var(--font-size) * 1.8)',
};

const checkboxesStateObj = (extCloud) => {
  return extCloud.namespaces.reduce((acc, namespace) => {
    acc[namespace.name] = false;
    return acc;
  }, {});
};

export const SelectiveSyncTableRow = ({ row, withCheckboxes }) => {
  const [isOpenFirstLevel, setIsOpenFirstLevel] = useState(false);
  const [openedSecondLevelListIndex, setOpenedSecondLevelListIndex] = useState(
    []
  );
  // @type {object} checkboxes state
  const [сheckboxesState, setCheckboxesState] = useState({
    parent: false,
    children: checkboxesStateObj(row),
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

  // set parent checkbox state based on changes of children checkboxes
  const setParentCheckboxState = (children) => {
    const childrenCheckboxes = Object.values(children);

    if (
      childrenCheckboxes.every((el) => el === false) ||
      childrenCheckboxes.every((el) => el === true)
    ) {
      return childrenCheckboxes[0];
    }
    if (childrenCheckboxes.some((el) => el === false)) {
      return true;
    }
    return сheckboxesState.parent;
  };

  const getNewChildren = (parentCheckedStatus) => {
    const newChildren = { ...сheckboxesState.children };

    Object.keys(сheckboxesState.children).forEach((name) => {
      newChildren[name] = parentCheckedStatus;
    });
    return newChildren;
  };

  const onChangeHandler = (name) => {
    if (!name) {
      setCheckboxesState({
        parent: !сheckboxesState.parent,
        children: getNewChildren(!сheckboxesState.parent),
      });
    } else {
      const newChildren = { ...сheckboxesState.children };
      newChildren[name] = !сheckboxesState.children[name];

      setCheckboxesState({
        children: newChildren,
        parent: setParentCheckboxState(newChildren),
      });
    }
  };

  const parentCheckboxValue = () => {
    const childrenCheckboxes = Object.values(сheckboxesState.children);

    if (
      сheckboxesState.parent &&
      childrenCheckboxes.some((el) => el === false) &&
      childrenCheckboxes.some((el) => el === true)
    ) {
      return checkValues.MIXED;
    }
    if (сheckboxesState.parent) {
      return checkValues.CHECKED;
    } else {
      return checkValues.UNCHECKED;
    }
  };

  const childrenCheckboxValue = (name) => {
    return сheckboxesState.children[name]
      ? checkValues.CHECKED
      : checkValues.UNCHECKED;
  };

  return (
    <>
      <EnhTableRow isTopLevel>
        <EnhTableRowCell isBigger withCheckboxes={withCheckboxes}>
          <EnhCollapseBtn
            withCheckboxes={withCheckboxes}
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
          {withCheckboxes && (
            <TriStateCheckbox
              label={row.cloud.name}
              onChange={() => onChangeHandler()}
              value={parentCheckboxValue()}
            />
          )}
          {!withCheckboxes && row.cloud.name}
        </EnhTableRowCell>
        <EnhTableRowCell>{row.cloud.cloudUrl}</EnhTableRowCell>
      </EnhTableRow>
      {isOpenFirstLevel &&
        (row?.namespaces || []).map((namespace, index) => (
          <EnhRowsWrapper key={namespace.name}>
            <EnhTableRow>
              <EnhTableRowCell isFirstLevel withCheckboxes={withCheckboxes}>
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
            </EnhTableRow>

            {openedSecondLevelListIndex.includes(index) && (
              <SelectiveSyncTableInfoRows namespace={namespace} />
            )}
          </EnhRowsWrapper>
        ))}
    </>
  );
};

SelectiveSyncTableRow.propTypes = {
  row: PropTypes.object.isRequired,
  withCheckboxes: PropTypes.bool.isRequired,
};
