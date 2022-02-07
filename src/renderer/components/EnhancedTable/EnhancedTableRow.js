import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';
import { AdditionalInfoRows } from './AdditionalInfoRows';
import { connectionStatuses, contextMenus } from '../../../strings';
import { EXTENDED_CLOUD_EVENTS } from '../../../common/ExtendedCloud';
import { openBrowser } from '../../../util/netUtil';
import {
  checkValues,
  TriStateCheckbox,
} from '../TriStateCheckbox/TriStateCheckbox';

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
    width: 50% !important;
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

export const EnhancedTableRow = ({
  extendedCloud,
  withCheckboxes,
  checkBoxChangeHandler,
  parentCheckboxValue,
  childrenCheckboxValue,
}) => {
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

  const renderRestOfRows = (namespace) => withCheckboxes ? (
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
          {withCheckboxes ? (
            <TriStateCheckbox
              label={extendedCloud.cloud.name}
              onChange={() => checkBoxChangeHandler(false)}
              value={parentCheckboxValue}
            />
          ) : (
            extendedCloud.cloud.name
          )}
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
                      <MenuItem key={`cloud-${item.name}`} onClick={item.onClick}>
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
                {withCheckboxes ? (
                  <TriStateCheckbox
                    label={namespace.name}
                    value={childrenCheckboxValue(namespace.name)}
                    onChange={() => checkBoxChangeHandler(namespace.name)}
                  />
                ) : (
                  namespace.name
                )}
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
  checkBoxChangeHandler: PropTypes.func,
  parentCheckboxValue: PropTypes.string,
  childrenCheckboxValue: PropTypes.func,
  withCheckboxes: PropTypes.bool,
};

EnhancedTableRow.defaultProps = {
  checkBoxChangeHandler: () => {},
  parentCheckboxValue: checkValues.UNCHECKED,
  childrenCheckboxValue: () => {},
  withCheckboxes: false,
};
