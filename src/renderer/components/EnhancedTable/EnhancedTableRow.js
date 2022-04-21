import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';
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
import { Cloud, CONNECTION_STATUSES } from '../../../common/Cloud';
import { openBrowser } from '../../../util/netUtil';
import { useClouds } from '../../store/CloudProvider';
import { sortNamespaces } from './tableUtil';
import { IpcRenderer } from '../../IpcRenderer';
import * as consts from '../../../constants';
import { CloudNamespace } from '../../../common/CloudNamespace';

const { Icon, MenuItem, MenuActions, ConfirmDialog, Tooltip } =
  Renderer.Component;

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

  ${({ isUnSynced }) =>
    isUnSynced &&
    `
    &::before {
      content: '';
      display: block;
      width: ${layout.grid * 6.75}px;
    }
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

const Warning = styled.div`
  position: relative;
  margin-left: ${layout.pad * 2.5}px;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;

  ${({ isVisible }) =>
    isVisible &&
    `
    opacity: 1;
    visibility: visible;
    pointer-events: all;
  `}
`;

const expandIconStyles = {
  color: 'var(--textColorPrimary)',
  fontSize: 'calc(var(--font-size) * 1.8)',
};

const warningIconStyle = {
  color: 'var(--colorWarning)',
};

const getCloudMenuItems = (cloud, cloudActions) => [
  {
    title: strings.contextMenus.cloud.reconnect(),
    name: 'reconnect',
    disabled: cloud.status === CONNECTION_STATUSES.CONNECTED,
    onClick: () => {
      // NOTE: this returns a promise, but we don't care about the result
      IpcRenderer.getInstance().invoke(
        consts.ipcEvents.invoke.RECONNECT,
        cloud.cloudUrl
      );
    },
  },
  {
    title: strings.contextMenus.cloud.remove(),
    name: 'remove',
    disabled: cloud.fetching,
    onClick: () => {
      const { name: cloudName, cloudUrl, syncedProjects, connected } = cloud;
      const isConnected = connected && cloud.loaded;
      if (isConnected && !cloud.namespaces.length) {
        cloudActions.removeCloud(cloudUrl);
      } else {
        ConfirmDialog.open({
          ok: () => {
            cloudActions.removeCloud(cloudUrl);
          },
          labelOk:
            strings.contextMenus.cloud.confirmDialog.confirmButtonLabel(),
          message: (
            <div
              dangerouslySetInnerHTML={{
                __html: strings.contextMenus.cloud.confirmDialog.messageHtml(
                  cloudName,
                  syncedProjects
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
      cloud.status === CONNECTION_STATUSES.DISCONNECTED || cloud.fetching,
    onClick: async () => {
      // NOTE: this returns a promise, but we don't care about the result
      IpcRenderer.getInstance().invoke(
        consts.ipcEvents.invoke.SYNC_NOW,
        cloud.cloudUrl
      );
    },
  },
  {
    title: strings.contextMenus.cloud.openInBrowser(),
    name: 'openInBrowser',
    disabled: false,
    onClick: () => {
      openBrowser(cloud.cloudUrl);
    },
  },
];

const getNamespaceMenuItems = (cloud, namespace) => [
  {
    title: strings.contextMenus.namespace.openInBrowser(),
    name: 'openInBrowser',
    onClick: () => {
      openBrowser(`${cloud.cloudUrl}/projects/${namespace.name}`);
    },
  },
];

export const EnhancedTableRow = ({
  cloud,
  withCheckboxes,
  isSyncStarted,
  getDataToSync,
  namespaces,
  status,
}) => {
  const { actions: cloudActions } = useClouds();
  const { getCheckboxValue, setCheckboxValue, getSyncedData } = useCheckboxes(
    makeCheckboxesInitialState(cloud)
  );
  const [syncAll, setSyncAll] = useState(cloud.syncAll);
  const [isOpenFirstLevel, setIsOpenFirstLevel] = useState(false);
  const [openNamespaces, setOpenNamespaces] = useState([]);

  const { syncedNamespaces, ignoredNamespaces } = getSyncedData();

  useEffect(() => {
    if (isSyncStarted && typeof getDataToSync === 'function') {
      getDataToSync(
        { syncedNamespaces, ignoredNamespaces, syncAll },
        cloud.cloudUrl
      );
    }
  }, [
    getDataToSync,
    isSyncStarted,
    getSyncedData,
    syncAll,
    cloud.cloudUrl,
    syncedNamespaces,
    ignoredNamespaces,
  ]);

  const isWarningVisible =
    withCheckboxes &&
    (syncedNamespaces.length >= consts.projectsCountBeforeWarning || syncAll);

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
        isParent && !cloud.connected
          ? ` (${strings.connectionStatuses.cloud.disconnected()})`
          : '';
      return (
        <>
          <TriStateCheckbox
            label={`${name}${autoSyncSuffix}`}
            onChange={() => setCheckboxValue({ name, isParent })}
            value={getCheckboxValue({ name, isParent })}
          />
        </>
      );
    }
    autoSyncSuffix =
      isParent && cloud.syncAll ? ` (${strings.syncView.autoSync()})` : '';

    return `${name}${autoSyncSuffix}`;
  };

  /**
   * @param {boolean} condition
   * @param {boolean} [showSecondLevel]
   * @return {JSX.Element|null}
   */
  const getExpandIcon = (condition, showSecondLevel = true) => {
    // when namespace isn't synced, we show first level but not second
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
    const cloudMenuItems = getCloudMenuItems(cloud, cloudActions);
    const { cloudStatus, styles } = status;
    return (
      <>
        <EnhTableRowCell>{cloud.username}</EnhTableRowCell>
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
    const namespaceMenuItems = getNamespaceMenuItems(cloud, namespace);
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
          {makeNameCell(cloud.name, true)}
          <Warning isVisible={isWarningVisible}>
            <Icon
              material="warning_amber"
              style={warningIconStyle}
              id={`tooltip-for-${cloud.name}-cloud`}
            />
            <Tooltip targetId={`tooltip-for-${cloud.name}-cloud`}>
              {strings.synchronizeBlock.warning()}
            </Tooltip>
          </Warning>
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
        <EnhTableRowCell>{cloud.cloudUrl}</EnhTableRowCell>
        {renderRestSyncTableRows()}
      </EnhTableRow>
      {isOpenFirstLevel &&
        sortNamespaces(namespaces).map((namespace) => (
          <EnhRowsWrapper key={namespace.name}>
            <EnhTableRow>
              <EnhTableRowCell
                isFirstLevel
                isUnSynced={!namespace.synced}
                withCheckboxes={withCheckboxes}
              >
                {namespace.synced && (
                  <EnhCollapseBtn onClick={() => setOpenedList(namespace.name)}>
                    {getExpandIcon(openNamespaces.includes(namespace.name))}
                  </EnhCollapseBtn>
                )}
                {makeNameCell(namespace.name)}
              </EnhTableRowCell>
              {renderNamespaceRows(namespace)}
            </EnhTableRow>

            {openNamespaces.includes(namespace.name) && namespace.synced && (
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
  cloud: PropTypes.instanceOf(Cloud).isRequired,
  withCheckboxes: PropTypes.bool,
  isSyncStarted: PropTypes.bool,
  getDataToSync: PropTypes.func,
  namespaces: PropTypes.arrayOf(PropTypes.instanceOf(CloudNamespace))
    .isRequired,
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
