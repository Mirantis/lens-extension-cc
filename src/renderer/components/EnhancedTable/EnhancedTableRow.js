import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';
import { AdditionalInfoRows } from './AdditionalInfoRows';
import { connectionStatuses, contextMenus } from '../../../strings';
import { EXTENDED_CLOUD_EVENTS } from '../../../common/ExtendedCloud';
import { TriStateCheckbox } from '../TriStateCheckbox/TriStateCheckbox';
import {
  useCheckboxes,
  makeCheckboxesInitialState,
} from '../hooks/useCheckboxes';
import { CONNECTION_STATUSES } from '../../../common/Cloud';
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

const colorYellow = {
  color: 'var(--colorWarning)',
};

const colorRed = {
  color: 'var(--colorError)',
};

/**
 * Determines the connection status of the Cloud.
 * @param {Cloud} cloud
 * @return {{cloudStatus: string, namespaceStatus: string, connectColor: Object}}
 *  where `cloudStatus` and `namespaceStatus` are labels, and `connectColor` is
 *  a style object to apply to the label.
 */
const getStatus = (cloud) => {
  switch (cloud.status) {
    case CONNECTION_STATUSES.CONNECTED:
      return {
        cloudStatus: connectionStatuses.cloud.connected(),
        namespaceStatus: connectionStatuses.namespace.connected(),
        connectColor: colorGreen,
      };

    case CONNECTION_STATUSES.CONNECTING:
      return {
        cloudStatus: connectionStatuses.cloud.connecting(),
        // NOTE: namespace is disconnected until Cloud is connected
        namespaceStatus: connectionStatuses.namespace.disconnected(),
        connectColor: colorYellow,
      };

    case CONNECTION_STATUSES.DISCONNECTED: // fall-through
    default:
      return {
        cloudStatus: connectionStatuses.cloud.disconnected(),
        namespaceStatus: connectionStatuses.namespace.disconnected(),
        connectColor: colorRed,
      };
  }
};

const cloudMenuItems = [
  {
    title: contextMenus.cloud.reconnect(),
    name: 'reconnect',
    onClick: (extendedCloud) => extendedCloud.reconnect(),
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
    title: `(WIP) ${contextMenus.namespace.createSshKey()}`,
    name: 'createSshKey',
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
  const { getCheckboxValue, setCheckboxValue } = useCheckboxes(
    makeCheckboxesInitialState(extendedCloud, extendedCloud.syncedNamespaces)
  );
  // show all namespaces if selectiveSync table or only syncedNamespaces in this main SyncView table
  const usedNamespaces = withCheckboxes ? 'namespaces' : 'syncedNamespaces';

  const [onOpen, toggleMenu] = useState(false);
  const [isOpenFirstLevel, setIsOpenFirstLevel] = useState(false);
  const [actualNamespaces, setActualNamespaces] = useState(
    extendedCloud[usedNamespaces]
  );
  const [openedSecondLevelListIndex, setOpenedSecondLevelListIndex] = useState(
    []
  );
  const updateNamespaces = (updatedRow) => {
    if (updatedRow) {
      setActualNamespaces(updatedRow[usedNamespaces]);
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

  const { cloudStatus, namespaceStatus, connectColor } = getStatus(
    extendedCloud.cloud
  );

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
      return (
        <TriStateCheckbox
          label={name}
          onChange={() => setCheckboxValue({ name, isParent })}
          value={getCheckboxValue({ name, isParent })}
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
            <EnhTableRowCell style={connectColor}>
              {cloudStatus}
            </EnhTableRowCell>
            <EnhTableRowCell isRightAligned>
              <EnhMore>
                <MenuActions onOpen={onOpen}>
                  {cloudMenuItems.map((item) => {
                    return (
                      <MenuItem
                        key={`cloud-${item.name}`}
                        onClick={() => item.onClick(extendedCloud)}
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
