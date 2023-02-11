import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { omit } from 'lodash';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';
import { AdditionalInfoRows } from './AdditionalInfoRows';
import {
  checkValues,
  TriStateCheckbox,
} from '../TriStateCheckbox/TriStateCheckbox';
import {
  useCheckboxes,
  makeCheckboxesInitialState,
} from '../hooks/useCheckboxes';
import { sortNamespaces } from './tableUtil';
import * as consts from '../../../constants';
import * as strings from '../../../strings';
import { getCloudConnectionError } from '../../rendererUtil';
import { CloudNamespace } from '../../../common/CloudNamespace';

const { Icon, MenuItem, MenuActions, Tooltip } = Renderer.Component;

const EnhRow = styled.tr`
  display: contents;
`;

const EnhRowsWrapper = styled.td`
  display: contents;
`;

const EnhRowsInnerTable = styled.table`
  display: contents;
`;

const EnhRowsInnerBody = styled.tbody`
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

const ConnectionError = styled.div(() => ({
  marginLeft: layout.grid,
}));

const CloudStatus = styled.div(() => ({
  display: 'flex',
  alignItems: 'center',
}));

const expandIconStyles = {
  color: 'var(--textColorPrimary)',
  fontSize: 'calc(var(--font-size) * 1.8)',
};

const warningIconStyle = {
  color: 'var(--colorWarning)',
};

export const EnhancedTableRow = ({
  cloud,
  withCheckboxes,
  isSyncStarted,
  getDataToSync,
  namespaces,
  status,
  getCloudMenuItems,
  getNamespaceMenuItems,
}) => {
  const { getCheckboxValue, setCheckboxValue, getSyncedData } = useCheckboxes(
    makeCheckboxesInitialState(cloud)
  );
  const [syncAll, setSyncAll] = useState(cloud.syncAll);
  const [offlineAccess, setOfflineAccess] = useState(cloud.offlineAccess);
  const [isOpenFirstLevel, setIsOpenFirstLevel] = useState(false);
  const [openNamespaces, setOpenNamespaces] = useState([]);

  const { syncedNamespaces, ignoredNamespaces } = getSyncedData();

  useEffect(() => {
    if (isSyncStarted && typeof getDataToSync === 'function') {
      getDataToSync(
        { syncedNamespaces, ignoredNamespaces, syncAll, offlineAccess },
        cloud.cloudUrl
      );
    }
  }, [
    getDataToSync,
    isSyncStarted,
    getSyncedData,
    syncAll,
    offlineAccess,
    cloud.cloudUrl,
    syncedNamespaces,
    ignoredNamespaces,
  ]);

  const isWarningVisible =
    syncedNamespaces.length >= consts.projectsCountBeforeWarning || syncAll;

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

    const cloudMenuItems = getCloudMenuItems(cloud);
    const { cloudStatus, styles } = status;

    let errorIcon;
    if (cloud.connectError) {
      const message = getCloudConnectionError(cloud);
      errorIcon = (
        <ConnectionError>
          <Icon
            id={`${cloud.name}-cloud-connection-error`}
            material="error"
            focusable={false}
            interactive={false}
            style={{ color: 'var(--colorError)' }}
          />
          <Tooltip targetId={`${cloud.name}-cloud-connection-error`}>
            {message}
          </Tooltip>
        </ConnectionError>
      );
    }

    return (
      <>
        <EnhTableRowCell>{cloud.username}</EnhTableRowCell>
        <EnhTableRowCell style={styles}>
          <CloudStatus>
            <span>{cloudStatus}</span>
            {errorIcon}
          </CloudStatus>
        </EnhTableRowCell>
        <EnhTableRowCell isRightAligned>
          <EnhMore>
            <MenuActions>
              {cloudMenuItems.map((item, idx) => {
                return (
                  <MenuItem {...omit(item, ['title'])} key={`cloud-${idx}`}>
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
              {namespaceMenuItems.map((item, idx) => {
                return (
                  <MenuItem
                    {...omit(item, ['title'])}
                    key={`${namespace.name}-${idx}`}
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
          {withCheckboxes && (
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
          )}
        </EnhTableRowCell>
        {withCheckboxes && (
          <>
            <EnhTableRowCell>
              <TriStateCheckbox
                label={strings.synchronizeBlock.synchronizeFutureProjects()}
                onChange={() => setSyncAll(!syncAll)}
                value={syncAll ? checkValues.CHECKED : checkValues.UNCHECKED}
              />
            </EnhTableRowCell>
            <EnhTableRowCell>
              <TriStateCheckbox
                label={strings.synchronizeBlock.useOfflineTokens()}
                onChange={() => setOfflineAccess(!offlineAccess)}
                value={
                  offlineAccess ? checkValues.CHECKED : checkValues.UNCHECKED
                }
              />
            </EnhTableRowCell>
          </>
        )}
        <EnhTableRowCell>{cloud.cloudUrl}</EnhTableRowCell>
        {renderRestSyncTableRows()}
      </EnhTableRow>
      {isOpenFirstLevel &&
        sortNamespaces(namespaces).map((namespace) => (
          <EnhRow key={namespace.name}>
            <EnhRowsWrapper>
              <EnhRowsInnerTable>
                <EnhRowsInnerBody>
                  <EnhTableRow>
                    <EnhTableRowCell
                      isFirstLevel
                      isUnSynced={!namespace.synced}
                      withCheckboxes={withCheckboxes}
                    >
                      {namespace.synced && (
                        <EnhCollapseBtn
                          onClick={() => setOpenedList(namespace.name)}
                        >
                          {getExpandIcon(
                            openNamespaces.includes(namespace.name)
                          )}
                        </EnhCollapseBtn>
                      )}
                      {makeNameCell(namespace.name)}
                    </EnhTableRowCell>
                    {renderNamespaceRows(namespace)}
                  </EnhTableRow>

                  {openNamespaces.includes(namespace.name) &&
                    namespace.synced && (
                      <AdditionalInfoRows
                        namespace={namespace}
                        emptyCellsCount={withCheckboxes ? 2 : 4}
                      />
                    )}
                </EnhRowsInnerBody>
              </EnhRowsInnerTable>
            </EnhRowsWrapper>
          </EnhRow>
        ))}
    </>
  );
};

EnhancedTableRow.propTypes = {
  // expecting Cloud instance (can't use `instanceOf(Cloud)` because we can't fake the Cloud
  //  class during unit tests; Jest mocks don't see capable of doing it in a way that still
  //  passes PropTypes.instanceof(Cloud))
  cloud: PropTypes.object.isRequired,

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

  /**
   * Called to get context menu items for a given Cloud.
   *
   * Signature: `(cloud: Cloud) => Array<{ title: string, disabled?: boolean, onClick: () => void }>`
   *
   * - `cloud`: The Cloud for which to get items.
   * - Returns: Array of objects that describe menu items in the Lens MenuItem component.
   *     The `title` property becomes the item's `children`, and the rest of the properties
   *     are props spread onto a `MenuItem` component.
   */
  getCloudMenuItems: PropTypes.func,

  /**
   * Called to get context menu items for a given Namespace in a Cloud.
   *
   * Signature: `(cloud: Cloud, namespace: CloudNamespace) => Array<{ title: string, disabled?: boolean, onClick: () => void }>`
   *
   * - `cloud`: The Cloud for which to get items.
   * - `namespace`: A namespace in the `cloud` for which to get items.
   * - Returns: Array of objects that describe menu items in the Lens MenuItem component.
   *     The `title` property becomes the item's `children`, and the rest of the properties
   *     are props spread onto a `MenuItem` component.
   */
  getNamespaceMenuItems: PropTypes.func,
};

EnhancedTableRow.defaultProps = {
  withCheckboxes: false,
  isSyncStarted: false,
  getDataToSync: null,
  getCloudMenuItems: () => [],
  getNamespaceMenuItems: () => [],
};
