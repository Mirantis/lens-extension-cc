import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';
import { AdditionalInfoRows } from './AdditionalInfoRows';
import {
  connectionStatuses,
  contextMenus,
  synchronizeBlock,
  syncView,
} from '../../../strings';
import {
  checkValues,
  TriStateCheckbox,
} from '../TriStateCheckbox/TriStateCheckbox';
import {
  useCheckboxes,
  makeCheckboxesInitialState,
} from '../hooks/useCheckboxes';
import { CONNECTION_STATUSES } from '../../../common/Cloud';
import { openBrowser } from '../../../util/netUtil';
import { cloudStore } from '../../../store/CloudStore';

const { Icon, MenuItem, MenuActions, ConfirmDialog } = Renderer.Component;

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

const colorGray = {
  color: 'var(--halfGray)',
};

/**
 * Determines the connection status of the Cloud.
 * @param {Cloud} cloud
 * @param {boolean} isFetching
 * @return {{cloudStatus: string, namespaceStatus: string, connectColor: Object}}
 *  where `cloudStatus` and `namespaceStatus` are labels, and `connectColor` is
 *  a style object to apply to the label.
 */
const getStatus = (cloud, isFetching) => {
  if (isFetching) {
    return {
      cloudStatus: connectionStatuses.cloud.updating(),
      namespaceStatus: connectionStatuses.namespace.connected(),
      connectColor: colorYellow,
    };
  }
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
        connectColor: colorGray,
      };
  }
};

const getCloudMenuItems = (extendedCloud) => [
  {
    title: contextMenus.cloud.reconnect(),
    name: 'reconnect',
    disabled: extendedCloud.cloud.status === CONNECTION_STATUSES.CONNECTED,
    onClick: () => extendedCloud.reconnect(),
  },
  {
    title: contextMenus.cloud.remove(),
    name: 'remove',
    disabled: false,
    onClick: () => {
      const {
        name: cloudName,
        cloudUrl,
        syncedNamespaces,
        connected,
      } = extendedCloud.cloud;
      const isConnected = connected && extendedCloud.loaded;
      if (isConnected && !extendedCloud.namespaces.length) {
        cloudStore.removeCloud(cloudUrl);
      } else {
        ConfirmDialog.open({
          ok: () => {
            cloudStore.removeCloud(cloudUrl);
          },
          labelOk: contextMenus.cloud.confirmDialog.confirmButtonLabel(),
          message: (
            <div
              dangerouslySetInnerHTML={{
                __html: contextMenus.cloud.confirmDialog.messageHtml(
                  cloudName,
                  syncedNamespaces
                ),
              }}
            />
          ),
        });
      }
    },
  },
  {
    title: contextMenus.cloud.sync(),
    name: 'sync',
    disabled: extendedCloud.cloud.status === CONNECTION_STATUSES.DISCONNECTED,
    onClick: () => extendedCloud.fetchNow(),
  },
  {
    title: contextMenus.cloud.openInBrowser(),
    name: 'openInBrowser',
    disabled: false,
    onClick: () => {
      openBrowser(extendedCloud.cloud.cloudUrl);
    },
  },
];

const namespaceMenuItems = [
  {
    title: `(WIP) ${contextMenus.namespace.openInBrowser()}`,
    name: 'openInBrowser',
    onClick: (namespace) => {},
  },
];

export const EnhancedTableRow = ({
  extendedCloud,
  withCheckboxes,
  isSyncStarted,
  getDataToSync,
  namespaces,
  fetching,
}) => {
  const { getCheckboxValue, setCheckboxValue, getSyncedData } = useCheckboxes(
    makeCheckboxesInitialState(extendedCloud)
  );
  const [syncAll, setSyncAll] = useState(extendedCloud.cloud.syncAll);
  const [isOpenFirstLevel, setIsOpenFirstLevel] = useState(false);
  const [openNamespaceIndexes, setOpenNamespaceIndexes] = useState([]);

  useEffect(() => {
    if (isSyncStarted && typeof getDataToSync === 'function') {
      const { syncedNamespaces, ignoredNamespaces } = getSyncedData();
      getDataToSync(
        { syncedNamespaces, ignoredNamespaces, syncAll },
        extendedCloud.cloud.cloudUrl
      );
    }
  }, [
    getDataToSync,
    isSyncStarted,
    getSyncedData,
    syncAll,
    extendedCloud.cloud.cloudUrl,
  ]);

  const setOpenedList = (index) => {
    if (openNamespaceIndexes.includes(index)) {
      setOpenNamespaceIndexes(
        openNamespaceIndexes.filter((rowIndex) => rowIndex !== index)
      );
    } else {
      setOpenNamespaceIndexes([...openNamespaceIndexes, index]);
    }
  };

  /**
   * @param {string} name cloud or namespace name
   * @param {boolean} [isParent] if true - then it's a main, cloud checkbox
   * @return {JSX.Element|string}
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
    const autoSyncSuffix =
      isParent && extendedCloud.cloud.syncAll
        ? ` (${syncView.autoSync()})`
        : '';

    return `${name}${autoSyncSuffix}`;
  };

  /**
   * @param {boolean} condition
   * @param {boolean} [showSecondLevel]
   * @return {JSX.Element|null}
   */
  const getExpandIcon = (condition, showSecondLevel = true) => {
    // EG when namespace isn't loaded, we show first level but not second
    if(!showSecondLevel) {
      return null
    }

    // SyncView mode - don't show if namespaces not loaded
    // but if it's Selective Sync  - show the icon (we use syncedNamespaces then)
    if ((!extendedCloud.loaded && !withCheckboxes)) {
      return null;
    }
    const material = condition ? 'expand_more' : 'chevron_right';
    return <Icon material={material} style={expandIconStyles} />;
  };

  const toggleOpenFirstLevel = () => {
    if (extendedCloud.loaded || withCheckboxes) {
      setIsOpenFirstLevel(!isOpenFirstLevel);
    }
  };

  const renderRestSyncTableRows = () => {
    if (withCheckboxes) {
      return null;
    }
    const cloudMenuItems = getCloudMenuItems(extendedCloud);
    const { cloudStatus, connectColor } = getStatus(
      extendedCloud.cloud,
      fetching
    );
    return (
      <>
        <EnhTableRowCell>{extendedCloud.cloud.username}</EnhTableRowCell>
        <EnhTableRowCell style={connectColor}>{cloudStatus}</EnhTableRowCell>
        <EnhTableRowCell isRightAligned>
          <EnhMore>
            <MenuActions>
              {cloudMenuItems.map((item) => {
                return (
                  <MenuItem
                    key={`cloud-${item.name}`}
                    disabled={item.disabled}
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
  };

  const renderNamespaceRows = (namespace) => {
    if (withCheckboxes) {
      return <EnhTableRowCell />;
    }
    const { namespaceStatus } = getStatus(extendedCloud.cloud, fetching);
    return (
      <>
        <EnhTableRowCell />
        <EnhTableRowCell />
        <EnhTableRowCell>{namespaceStatus}</EnhTableRowCell>
        <EnhTableRowCell isRightAligned>
          <EnhMore>
            <MenuActions>
              {namespaceMenuItems.map((item) => {
                return (
                  <MenuItem
                    key={`${namespace.name}-${item.name}`}
                    onClick={() => item.onClick(namespace)}
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
  };

  return (
    <>
      <EnhTableRow isTopLevel>
        <EnhTableRowCell isBigger withCheckboxes={withCheckboxes}>
          <EnhCollapseBtn onClick={toggleOpenFirstLevel}>
            {getExpandIcon(isOpenFirstLevel)}
          </EnhCollapseBtn>
          {makeCell(extendedCloud.cloud.name, true)}
        </EnhTableRowCell>
        {withCheckboxes && (
          <EnhTableRowCell>
            <TriStateCheckbox
              label={synchronizeBlock.synchronizeFutureProjects()}
              onChange={() => setSyncAll(!syncAll)}
              value={syncAll ? checkValues.CHECKED : checkValues.UNCHECKED}
            />
          </EnhTableRowCell>
        )}
        <EnhTableRowCell>{extendedCloud.cloud.cloudUrl}</EnhTableRowCell>
        {renderRestSyncTableRows()}
      </EnhTableRow>
      {isOpenFirstLevel &&
        namespaces.map((namespace, index) => (
          <EnhRowsWrapper key={namespace.name}>
            <EnhTableRow>
              <EnhTableRowCell isFirstLevel withCheckboxes={withCheckboxes}>
                <EnhCollapseBtn onClick={() => setOpenedList(index)}>
                  {getExpandIcon(
                    openNamespaceIndexes.includes(index),
                    extendedCloud.loaded
                  )}
                </EnhCollapseBtn>
                {makeCell(namespace.name)}
              </EnhTableRowCell>
              {renderNamespaceRows(namespace)}
            </EnhTableRow>

            {openNamespaceIndexes.includes(index) && (
              <AdditionalInfoRows
                namespace={namespace}
                emptyCellsCount={withCheckboxes ? 2 : 4}
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
  isSyncStarted: PropTypes.bool,
  getDataToSync: PropTypes.func,
  namespaces: PropTypes.arrayOf(PropTypes.object).isRequired,
  fetching: PropTypes.bool.isRequired,
};

EnhancedTableRow.defaultProps = {
  withCheckboxes: false,
  isSyncStarted: false,
  getDataToSync: null,
};
