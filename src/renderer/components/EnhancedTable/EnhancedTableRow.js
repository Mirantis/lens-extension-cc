import PropTypes from 'prop-types';
import { useState } from 'react';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';
import { AdditionalInfoRows } from './AdditionalInfoRows';

const { Component } = Renderer;

const EnhTableRow = styled.tr`
  background-color: ${({ isTopLevel }) =>
    isTopLevel ? 'var(--layoutTabsBackground)' : 'var(--mainBackground)'};
`;

const EnhTableCell = styled.td`
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
      const someArray = [...openedSecondLevelListIndex];
      someArray.splice(openedSecondLevelListIndex.indexOf(index), 1);
      setOpenedSecondLevelListIndex(someArray);
    } else {
      setOpenedSecondLevelListIndex([...openedSecondLevelListIndex, index]);
    }
  };

  return (
    <>
      <EnhTableRow isTopLevel>
        <EnhTableCell isBigger>
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
        </EnhTableCell>
        <EnhTableCell>{row.cloud.cloudUrl}</EnhTableCell>
        <EnhTableCell>{row.cloud.username}</EnhTableCell>
        {/* NEED TO CHANGE STATUS DYNAMIC */}
        <EnhTableCell>STATUS</EnhTableCell>
        <EnhTableCell isRightAligned>
          <EnhMoreButton>
            <Component.Icon material="more_vert" style={moreInfoIconStyles} />
          </EnhMoreButton>
        </EnhTableCell>
      </EnhTableRow>
      {isOpenFirstLevel &&
        row.namespaces.map((namespace, index) => (
          <div style={{ display: 'contents' }} key={namespace.name}>
            <EnhTableRow>
              <EnhTableCell isFirstLevel>
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
              </EnhTableCell>
              <EnhTableCell></EnhTableCell>
              <EnhTableCell></EnhTableCell>
              {/* NEED TO CHANGE STATUS DYNAMIC */}
              <EnhTableCell>STATUS</EnhTableCell>
              <EnhTableCell isRightAligned>
                <EnhMoreButton>
                  <Component.Icon
                    material="more_vert"
                    style={moreInfoIconStyles}
                  />
                </EnhMoreButton>
              </EnhTableCell>
            </EnhTableRow>

            {openedSecondLevelListIndex.includes(index) && (
              <AdditionalInfoRows namespace={namespace} />
            )}
          </div>
        ))}
    </>
  );
};

EnhancedTableRow.propTypes = {
  row: PropTypes.object.isRequired,
};
