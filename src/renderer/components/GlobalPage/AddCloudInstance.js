import styled from '@emotion/styled';
import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { layout } from '../styles';
import { ConnectionBlock } from './ConnectionBlock';
import { SynchronizeBlock } from './SynchronizeBlock';
import { CloseButton } from '../CloseButton/CloseButton';
import { ErrorPanel } from '../ErrorPanel';
import {
  ExtendedCloud,
  EXTENDED_CLOUD_EVENTS,
} from '../../../common/ExtendedCloud';
import { Renderer } from '@k8slens/extensions';
import { normalizeUrl } from '../../../util/netUtil';
import { addCloudInstance } from '../../../strings';
import {
  Cloud,
  CONNECTION_STATUSES,
  CLOUD_EVENTS,
} from '../../../common/Cloud';

const {
  Component: { Notifications, Spinner },
} = Renderer;

const PageContainer = styled.div(function () {
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--contentColor)',
    display: 'flex',
    justifyContent: 'space-between',
  };
});
const EscColumn = styled.div(function () {
  return {
    margin: layout.gap,
    width: '50px',
    flexShrink: 1,
  };
});

const MainColumn = styled.div(function () {
  return {
    display: 'flex',
    flex: 1,
    justifyContent: 'start',
    flexDirection: 'column',
    alignItems: 'center',
    maxHeight: '100%',
    overflow: 'auto',
  };
});

const ErrorPanelWrapper = styled.div(function () {
  return {
    maxWidth: '750px',
    width: '100%',
    marginTop: layout.gap * 3,
  };
});

export const AddCloudInstance = ({ onAdd, onCancel }) => {
  const [cloud, setCloud] = useState(null);
  const [extCloud, setExtCloud] = useState(null);
  const [loading, setLoading] = useState(false);

  const makeExtCloud = useCallback(() => {
    setLoading(true);

    const extCl = new ExtendedCloud(cloud);

    const loadingListener = () => {
      // when extCl loaded, it means extCl contains all needed data
      // so we store it as extCloud in local state
      if (extCl && !extCl.loading && !extCloud) {
        if (extCl.error) {
          Notifications.error(extCl.error);
        }
        setExtCloud(extCl);

        extCl.removeEventListener(
          EXTENDED_CLOUD_EVENTS.LOADED,
          loadingListener
        );
        extCl.removeEventListener(
          EXTENDED_CLOUD_EVENTS.ERROR_CHANGE,
          loadingListener
        );
      }
      setLoading(extCl.loading);
    };

    extCl.addEventListener(EXTENDED_CLOUD_EVENTS.LOADED, loadingListener);
    extCl.addEventListener(EXTENDED_CLOUD_EVENTS.ERROR_CHANGE, loadingListener);
  }, [extCloud, cloud]);

  const cleanCloudsState = () => {
    setCloud(null);

    extCloud?.destroy();
    setExtCloud(null);
  };

  useEffect(() => {
    if (cloud && !loading && !extCloud) {
      makeExtCloud();
    }
  }, [cloud, loading, extCloud, makeExtCloud]);

  // propertly destroy the ExtendedCloud object on unmount
  useEffect(() => {
    return () => extCloud?.destroy();
  }, [extCloud]);

  const checkConnectionError = (managementCluster) => {
    if (managementCluster?.connectError) {
      Notifications.error(managementCluster.connectError);
    }
  };

  const handleClusterConnect = async function (
    managementClusterUrl,
    setManagementClusterUrl,
    managementClusterName
  ) {
    cleanCloudsState();
    const normUrl = normalizeUrl(managementClusterUrl.trim());
    setManagementClusterUrl(normUrl); // update to actual URL we'll use
    setLoading(true);
    let newCloud = new Cloud();
    newCloud.cloudUrl = normUrl;
    newCloud.name = managementClusterName;
    const statusListener = () => {
      if (newCloud.status === CONNECTION_STATUSES.CONNECTING) {
        setLoading(true);
      } else {
        setLoading(false);
        newCloud.removeEventListener(
          CLOUD_EVENTS.STATUS_CHANGE,
          statusListener
        );
        if (newCloud.status === CONNECTION_STATUSES.CONNECTED) {
          setCloud(newCloud);
        } else {
          checkConnectionError(newCloud);
        }
      }
    };
    newCloud.addEventListener(CLOUD_EVENTS.STATUS_CHANGE, statusListener);
    await newCloud.connect();
  };

  return (
    <PageContainer>
      <MainColumn>
        <ConnectionBlock
          extCloudLoading={loading}
          handleClusterConnect={handleClusterConnect}
        />
        {loading ? (
          <Spinner />
        ) : (
          extCloud &&
          (!extCloud.error ? (
            <SynchronizeBlock extendedCloud={extCloud} onAdd={onAdd} />
          ) : (
            <ErrorPanelWrapper>
              <ErrorPanel>
                <p
                  dangerouslySetInnerHTML={{
                    __html: addCloudInstance.errorHtml(),
                  }}
                />
              </ErrorPanel>
            </ErrorPanelWrapper>
          ))
        )}
      </MainColumn>
      <EscColumn>
        <CloseButton onClick={onCancel} />
      </EscColumn>
    </PageContainer>
  );
};

AddCloudInstance.propTypes = {
  onCancel: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
};
