import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';
import { AdditionalInfoRows } from './AdditionalInfoRows';
import { connectionStatuses, contextMenus } from '../../../strings';
import { EXTENDED_CLOUD_EVENTS } from '../../../common/ExtendedCloud';
import { TriStateCheckbox } from '../TriStateCheckbox/TriStateCheckbox';
import { useCheckboxes } from '../hooks/useCheckboxes';
import { openBrowser } from '../../../util/netUtil';

const { Icon, MenuItem, MenuActions } = Renderer.Component;

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
    display: flex;
    align-items: center;
  `}
`;

const EnhCollapseBtn = styled.button`
  background: transparent;
  cursor: pointer;
  margin-right: ${layout.grid * 1.5}px;
`;

const EnhMore = styled.div`
  background: transparent;
  cursor: pointer;
`;

const expandIconStyles = {
  color: 'var(--textColorPrimary)',
  fontSize: 'calc(var(--font-size) * 1.8)',
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

const cloudMenuItems = [
  {
    title: contextMenus.cloud.reconnect(),
    name: 'reconnect',
    onClick: (extendedCloud) => extendedCloud.cloud.connect(),
  },
  {
    title: `(WIP) ${contextMenus.cloud.remove()}`,
    name: 'remove',
    onClick: () => {},
  },
  {
    title: `(WIP) ${contextMenus.cloud.sync()}`,
    name: 'sync',
    onClick: () => {},
  },
  {
    title: contextMenus.cloud.openInBrowser(),
    name: 'openInBrowser',
    onClick: (extendedCloud) => {
      openBrowser(extendedCloud.cloud.cloudUrl);
    },
  },
];

const namespaceMenuItems = [
  {
    title: `(WIP) ${contextMenus.namespace.sync()}`,
    name: 'sync',
    onClick: () => {},
  },
  {
    title: `(WIP) ${contextMenus.namespace.openInBrowser()}`,
    name: 'openInBrowser',
    onClick: () => {},
  },
  {
    title: `(WIP) ${contextMenus.namespace.createCluster()}`,
    name: 'createCluster',
    onClick: () => {},
  },
  {
    title: `(WIP) ${contextMenus.namespace.createSHHKey()}`,
    name: 'createSHHKey',
    onClick: () => {},
  },
  {
    title: `(WIP) ${contextMenus.namespace.createCredential()}`,
    name: 'createCredential',
    onClick: () => {},
  },
  {
    title: `(WIP) ${contextMenus.namespace.createLicense()}`,
    name: 'createLicense',
    onClick: () => {},
  },
  {
    title: `(WIP) ${contextMenus.namespace.createProxy()}`,
    name: 'createProxy',
    onClick: () => {},
  },
];

export const EnhancedTableRow = ({ extendedCloud, withCheckboxes }) => {
  const {
    checkBoxChangeHandler,
    getChildrenCheckboxValue,
    parentCheckboxValue,
  } = useCheckboxes(extendedCloud);

  const [onOpen, toggleMenu] = useState(false);
  const [isOpenFirstLevel, setIsOpenFirstLevel] = useState(false);
  const [actualNamespaces, setActualNamespaces] = useState(
    extendedCloud.syncedNamespaces
  );
  const [openedSecondLevelListIndex, setOpenedSecondLevelListIndex] = useState(
    []
  );
  const updateNamespaces = (updatedRow) => {
    if (updatedRow) {
      setActualNamespaces(updatedRow.syncedNamespaces);
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

  const renderRestOfRows = (namespace) =>
    withCheckboxes ? (
      <EnhTableRowCell />
    ) : (
      <>
        <EnhTableRowCell />
        <EnhTableRowCell />
        <EnhTableRowCell>{namespaceStatus}</EnhTableRowCell>
        <EnhTableRowCell isRightAligned>
          <EnhMore onClick={() => toggleMenu(!onOpen)}>
            <MenuActions onOpen={onOpen}>
              {namespaceMenuItems.map((item) => {
                return (
                  <MenuItem
                    key={`${namespace.name}-${item.name}`}
                    onClick={item.onClick}
                  >
                    {item.title}
                  </MenuItem>
                );
              })}
            </MenuActions>
          </EnhMore>
        </EnhTableRowCell>
      </>
    );

  /**
   * @param {string} name cloud or namespace name
   * @param {boolean?} isParent if true - then it's a main, cloud checkbox
   * @return {JSX.Element|*}
   */
  const makeCell = (name, isParent) => {
    if (withCheckboxes) {
      const handlerValue = isParent ? null : name;
      return (
        <TriStateCheckbox
          label={name}
          onChange={() => checkBoxChangeHandler(handlerValue)}
          value={
            isParent ? parentCheckboxValue : getChildrenCheckboxValue(name)
          }
        />
      );
    }
    return name;
  };

  return (
    <>
      <EnhTableRow isTopLevel>
        <EnhTableRowCell isBigger withCheckboxes={withCheckboxes}>
          <EnhCollapseBtn
            onClick={() => setIsOpenFirstLevel(!isOpenFirstLevel)}
          >
            {isOpenFirstLevel ? (
              <Icon material="expand_more" style={expandIconStyles} />
            ) : (
              <Icon material="chevron_right" style={expandIconStyles} />
            )}
          </EnhCollapseBtn>
          {makeCell(extendedCloud.cloud.name, true)}
        </EnhTableRowCell>
        <EnhTableRowCell>{extendedCloud.cloud.cloudUrl}</EnhTableRowCell>
        {withCheckboxes ? null : (
          <>
            <EnhTableRowCell>{extendedCloud.cloud.username}</EnhTableRowCell>
            <EnhTableRowCell style={isCloudConnected ? colorGreen : colorRed}>
              {cloudStatus}
            </EnhTableRowCell>
            <EnhTableRowCell isRightAligned>
              <EnhMore>
                <MenuActions onOpen={onOpen}>
                  {cloudMenuItems.map((item) => {
                    return (
                      <MenuItem
                        key={`cloud-${item.name}`}
                        onClick={item.onClick}
                      >
                        {item.title}
                      </MenuItem>
                    );
                  })}
                </MenuActions>
              </EnhMore>
            </EnhTableRowCell>
          </>
        )}
      </EnhTableRow>
      {isOpenFirstLevel &&
        actualNamespaces.map((namespace, index) => (
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
                {makeCell(namespace.name)}
              </EnhTableRowCell>
              {renderRestOfRows(namespace)}
            </EnhTableRow>

            {openedSecondLevelListIndex.includes(index) && (
              <AdditionalInfoRows
                namespace={namespace}
                emptyCellsCount={withCheckboxes ? 1 : 4}
              />
            )}
          </EnhRowsWrapper>
        ))}
    </>
  );
};

EnhancedTableRow.propTypes = {
  extendedCloud: PropTypes.object.isRequired,
  withCheckboxes: PropTypes.bool,
};

EnhancedTableRow.defaultProps = {
  withCheckboxes: false,
};
