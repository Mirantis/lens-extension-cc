import PropTypes from 'prop-types';
import { useState } from 'react';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';
import { AdditionalInfoRows } from './AdditionalInfoRows';

const { Component } = Renderer;

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

export const EnhancedTableRow = (props) => {
  const { row } = props;
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

  return (
    <>
      <EnhTableRow isTopLevel>
        <EnhTableRowCell isBigger>
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
          {row.cloud.name}
        </EnhTableRowCell>
        <EnhTableRowCell>{row.cloud.cloudUrl}</EnhTableRowCell>
        <EnhTableRowCell>{row.cloud.username}</EnhTableRowCell>
        {/* NEED TO CHANGE STATUS DYNAMIC */}
        <EnhTableRowCell>STATUS</EnhTableRowCell>
        <EnhTableRowCell isRightAligned>
          <EnhMoreButton>
            <Component.Icon material="more_vert" style={moreInfoIconStyles} />
          </EnhMoreButton>
        </EnhTableRowCell>
      </EnhTableRow>
      {isOpenFirstLevel &&
        (row?.namespaces || []) &&
        row.namespaces.map((namespace, index) => (
          <EnhRowsWrapper key={namespace.name}>
            <EnhTableRow>
              <EnhTableRowCell isFirstLevel>
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
                {namespace.name}
              </EnhTableRowCell>
              <EnhTableRowCell />
              <EnhTableRowCell />
              {/* NEED TO CHANGE STATUS DYNAMIC */}
              <EnhTableRowCell>STATUS</EnhTableRowCell>
              <EnhTableRowCell isRightAligned>
                <EnhMoreButton>
                  <Component.Icon
                    material="more_vert"
                    style={moreInfoIconStyles}
                  />
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
