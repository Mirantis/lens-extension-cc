import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';
import { AdditionalInfoRows } from './AdditionalInfoRows';
import { connectionStatuses, contextMenus } from '../../../strings';
import { EXTENDED_CLOUD_EVENTS } from '../../../common/ExtendedCloud';
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
`;

const EnhCollapseBtn = styled.button`
  background: transparent;
  cursor: pointer;
  margin-right: ${layout.grid * 1.5}px;
  transform: translateY(-2px);
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
    title: `(WIP) ${contextMenus.cloud.reconnect()}`,
    name: 'reconnect',
    onClick: () => {},
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
    title: `${contextMenus.cloud.openInBrowser()}`,
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

export const EnhancedTableRow = ({ extendedCloud }) => {
  const [onOpen, toggleMenu] = useState(false);
  const [isOpenFirstLevel, setIsOpenFirstLevel] = useState(false);
  const [actualNamespaces, setActualNamespaces] = useState(
    extendedCloud.namespaces
  );
  const [openedSecondLevelListIndex, setOpenedSecondLevelListIndex] = useState(
    []
  );
  const updateNamespaces = (updatedRow) => {
    if (updatedRow) {
      setActualNamespaces(updatedRow.namespaces);
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

  return (
    <>
      <EnhTableRow isTopLevel>
        <EnhTableRowCell isBigger>
          <EnhCollapseBtn
            onClick={() => setIsOpenFirstLevel(!isOpenFirstLevel)}
          >
            {isOpenFirstLevel ? (
              <Icon material="expand_more" style={expandIconStyles} />
            ) : (
              <Icon material="chevron_right" style={expandIconStyles} />
            )}
          </EnhCollapseBtn>
          {extendedCloud.cloud.name}
        </EnhTableRowCell>
        <EnhTableRowCell>{extendedCloud.cloud.cloudUrl}</EnhTableRowCell>
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
                    onClick={() => item.onClick(extendedCloud)}
                  >
                    {item.title}
                  </MenuItem>
                );
              })}
            </MenuActions>
          </EnhMore>
        </EnhTableRowCell>
      </EnhTableRow>
      {isOpenFirstLevel &&
        (actualNamespaces || []).map((namespace, index) => (
          <EnhRowsWrapper key={namespace.name}>
            <EnhTableRow>
              <EnhTableRowCell isFirstLevel>
                <EnhCollapseBtn onClick={() => setOpenedList(index)}>
                  {openedSecondLevelListIndex.includes(index) ? (
                    <Icon material="expand_more" style={expandIconStyles} />
                  ) : (
                    <Icon material="chevron_right" style={expandIconStyles} />
                  )}
                </EnhCollapseBtn>
                {namespace.name}
              </EnhTableRowCell>
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
  extendedCloud: PropTypes.object.isRequired,
};
