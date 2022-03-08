import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';
import { Namespace } from '../../../api/types/Namespace';
import { AdditionalInfoRows } from './AdditionalInfoRows';
import * as strings from '../../../strings';
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
import { sortNamespaces } from './tableUtil';
import { IpcRenderer } from '../../IpcRenderer';
import * as consts from '../../../constants';

const { Icon, MenuItem, MenuActions, ConfirmDialog } = Renderer.Component;

const EnhRowsWrapper = styled.div`
  display: contents;
`;

const EnhTableRow = styled.tr`
  background-color: ${({ isTopLevel }) =>
    isTopLevel ? 'var(--layoutTabsBackground)' : 'var(--mainBackground)'};
`;

const EnhTableRowCell = styled.td`
  width: ${({ isBigger, withCheckboxes }) =>
    isBigger && !withCheckboxes && '40%'};
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

const getCloudMenuItems = (dataCloud) => [
  {
    title: strings.contextMenus.cloud.reconnect(),
    name: 'reconnect',
    disabled: dataCloud.cloud.status === CONNECTION_STATUSES.CONNECTED,
    onClick: () => dataCloud.reconnect(),
  },
  {
    title: strings.contextMenus.cloud.remove(),
    name: 'remove',
    disabled: dataCloud.fetching,
    onClick: () => {
      const {
        name: cloudName,
        cloudUrl,
        syncedNamespaces,
        connected,
      } = dataCloud.cloud;
      const isConnected = connected && dataCloud.loaded;
      if (isConnected && !dataCloud.namespaces.length) {
        cloudStore.removeCloud(cloudUrl);
      } else {
        ConfirmDialog.open({
          ok: () => {
            cloudStore.removeCloud(cloudUrl);
          },
          labelOk:
            strings.contextMenus.cloud.confirmDialog.confirmButtonLabel(),
          message: (
            <div
              dangerouslySetInnerHTML={{
                __html: strings.contextMenus.cloud.confirmDialog.messageHtml(
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
    title: strings.contextMenus.cloud.sync(),
    name: 'sync',
    disabled:
      dataCloud.cloud.status === CONNECTION_STATUSES.DISCONNECTED ||
      dataCloud.fetching,
    onClick: async () => {
      dataCloud.fetchNow();

      // NOTE: this returns a promise, but we don't care about the result
      IpcRenderer.getInstance().invoke(
        consts.ipcEvents.invoke.SYNC_NOW,
        dataCloud.cloud.cloudUrl
      );
    },
  },
  {
    title: strings.contextMenus.cloud.openInBrowser(),
    name: 'openInBrowser',
    disabled: false,
    onClick: () => {
      openBrowser(dataCloud.cloud.cloudUrl);
    },
  },
];

const getNamespaceMenuItems = (dataCloud, namespace) => [
  {
    title: strings.contextMenus.namespace.openInBrowser(),
    name: 'openInBrowser',
    onClick: () => {
      openBrowser(`${dataCloud.cloud.cloudUrl}/projects/${namespace.name}`);
    },
  },
];

export const EnhancedTableRow = ({
  dataCloud,
  withCheckboxes,
  isSyncStarted,
  getDataToSync,
  namespaces,
  status,
}) => {
  const { getCheckboxValue, setCheckboxValue, getSyncedData } = useCheckboxes(
    makeCheckboxesInitialState(dataCloud)
  );
  const [syncAll, setSyncAll] = useState(dataCloud.cloud.syncAll);
  const [isOpenFirstLevel, setIsOpenFirstLevel] = useState(false);
  const [openNamespaces, setOpenNamespaces] = useState([]);

  useEffect(() => {
    if (isSyncStarted && typeof getDataToSync === 'function') {
      const { syncedNamespaces, ignoredNamespaces } = getSyncedData();
      getDataToSync(
        { syncedNamespaces, ignoredNamespaces, syncAll },
        dataCloud.cloud.cloudUrl
      );
    }
  }, [
    getDataToSync,
    isSyncStarted,
    getSyncedData,
    syncAll,
    dataCloud.cloud.cloudUrl,
  ]);

  const setOpenedList = (name) => {
    if (openNamespaces.includes(name)) {
      setOpenNamespaces(openNamespaces.filter((n) => n !== name));
    } else {
      setOpenNamespaces([...openNamespaces, name]);
    }
  };

  /**
   * @param {string} name cloud or namespace name
   * @param {boolean} [isParent] if true - then it's a main, cloud checkbox
   * @return {JSX.Element|string}
   */
  const makeNameCell = (name, isParent) => {
    let autoSyncSuffix = '';
    if (withCheckboxes) {
      autoSyncSuffix =
        isParent && !dataCloud.cloud.connected
          ? ` (${strings.connectionStatuses.cloud.disconnected()})`
          : '';
      return (
        <TriStateCheckbox
          label={`${name}${autoSyncSuffix}`}
          onChange={() => setCheckboxValue({ name, isParent })}
          value={getCheckboxValue({ name, isParent })}
        />
      );
    }
    autoSyncSuffix =
      isParent && dataCloud.cloud.syncAll
        ? ` (${strings.syncView.autoSync()})`
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
    if (!showSecondLevel) {
      return null;
    }

    // don't show if no namespaces, no matter which mode is it
    if (!namespaces.length) {
      return null;
    }
    const material = condition ? 'expand_more' : 'chevron_right';
    return <Icon material={material} style={expandIconStyles} />;
  };

  const toggleOpenFirstLevel = () => {
    if (namespaces.length) {
      setIsOpenFirstLevel(!isOpenFirstLevel);
    }
  };

  const renderRestSyncTableRows = () => {
    if (withCheckboxes) {
      return null;
    }
    const cloudMenuItems = getCloudMenuItems(dataCloud);
    const { cloudStatus, styles } = status;
    return (
      <>
        <EnhTableRowCell>{dataCloud.cloud.username}</EnhTableRowCell>
        <EnhTableRowCell style={styles}>{cloudStatus}</EnhTableRowCell>
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
    const namespaceMenuItems = getNamespaceMenuItems(dataCloud, namespace);
    const { namespaceStatus } = status;
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

  return (
    <>
      <EnhTableRow isTopLevel>
        <EnhTableRowCell isBigger withCheckboxes={withCheckboxes}>
          <EnhCollapseBtn onClick={toggleOpenFirstLevel}>
            {getExpandIcon(isOpenFirstLevel)}
          </EnhCollapseBtn>
          {makeNameCell(dataCloud.cloud.name, true)}
        </EnhTableRowCell>
        {withCheckboxes && (
          <EnhTableRowCell>
            <TriStateCheckbox
              label={strings.synchronizeBlock.synchronizeFutureProjects()}
              onChange={() => setSyncAll(!syncAll)}
              value={syncAll ? checkValues.CHECKED : checkValues.UNCHECKED}
            />
          </EnhTableRowCell>
        )}
        <EnhTableRowCell>{dataCloud.cloud.cloudUrl}</EnhTableRowCell>
        {renderRestSyncTableRows()}
      </EnhTableRow>
      {isOpenFirstLevel &&
        sortNamespaces(namespaces).map((namespace) => (
          <EnhRowsWrapper key={namespace.name}>
            <EnhTableRow>
              <EnhTableRowCell isFirstLevel withCheckboxes={withCheckboxes}>
                <EnhCollapseBtn onClick={() => setOpenedList(namespace.name)}>
                  {getExpandIcon(
                    openNamespaces.includes(namespace.name),
                    dataCloud.loaded
                  )}
                </EnhCollapseBtn>
                {makeNameCell(namespace.name)}
              </EnhTableRowCell>
              {renderNamespaceRows(namespace)}
            </EnhTableRow>

            {openNamespaces.includes(namespace.name) && (
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
  dataCloud: PropTypes.object.isRequired,
  withCheckboxes: PropTypes.bool,
  isSyncStarted: PropTypes.bool,
  getDataToSync: PropTypes.func,
  namespaces: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.instanceOf(Namespace),
      PropTypes.shape({
        name: PropTypes.string.isRequired,
      }),
    ])
  ).isRequired,
  status: PropTypes.shape({
    cloudStatus: PropTypes.string.isRequired,
    namespaceStatus: PropTypes.string.isRequired,
    styles: PropTypes.object.isRequired,
  }).isRequired,
};

EnhancedTableRow.defaultProps = {
  withCheckboxes: false,
  isSyncStarted: false,
  getDataToSync: null,
};
