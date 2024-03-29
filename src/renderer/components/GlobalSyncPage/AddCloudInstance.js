import styled from '@emotion/styled';
import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { layout } from '../styles';
import { ConnectionBlock } from './ConnectionBlock';
import { SynchronizeBlock } from './SynchronizeBlock';
import { CloseButton } from '../CloseButton/CloseButton';
import { DataCloud, DATA_CLOUD_EVENTS } from '../../../common/DataCloud';
import { IpcRenderer } from '../../IpcRenderer';
import { Renderer } from '@k8slens/extensions';
import { normalizeUrl } from '../../../util/netUtil';
import { getCloudConnectionError } from '../../rendererUtil';
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

export const AddCloudInstance = ({ onAdd, onCancel }) => {
  const [cloud, setCloud] = useState(null);
  const [dataCloud, setDataCloud] = useState(null);
  const [loading, setLoading] = useState(false);

  const makeDataCloud = useCallback(() => {
    setLoading(true);

    // just use a minimal preview instance since it's throw-away
    const dc = new DataCloud({
      cloud,
      preview: true,
      ipc: IpcRenderer.getInstance(),
    });

    const loadingListener = () => {
      // when DataCloud loaded, it means it contains all needed data
      // so we store it as dataCloud in local state
      if (dc && !dc.loading && !dataCloud) {
        if (dc.error) {
          Notifications.error(dc.error);
        }
        setDataCloud(dc);

        dc.removeEventListener(DATA_CLOUD_EVENTS.LOADED, loadingListener);
        dc.removeEventListener(DATA_CLOUD_EVENTS.ERROR_CHANGE, loadingListener);
      }
      setLoading(dc.loading);
    };

    dc.addEventListener(DATA_CLOUD_EVENTS.LOADED, loadingListener);
    dc.addEventListener(DATA_CLOUD_EVENTS.ERROR_CHANGE, loadingListener);
  }, [dataCloud, cloud]);

  const cleanCloudsState = () => {
    dataCloud?.destroy();
    setDataCloud(null);

    cloud?.destroy();
    setCloud(null);
  };

  useEffect(() => {
    if (cloud && !loading && !dataCloud) {
      makeDataCloud();
    }
  }, [cloud, loading, dataCloud, makeDataCloud]);

  // propertly destroy the DataCloud object on unmount, but NOT the Cloud because
  //  we may have passed it back through `onAdd()`
  useEffect(() => {
    return () => dataCloud?.destroy();
  }, [dataCloud]);

  const checkConnectionError = (newCloud) => {
    const message = getCloudConnectionError(newCloud);
    Notifications.error(message, { timeout: 0 }); // require user to dismiss
  };

  const handleClusterConnect = async function ({
    clusterUrl,
    clusterName,
    offlineAccess,
    trustHost,
  }) {
    cleanCloudsState();
    setLoading(true);

    const normUrl = normalizeUrl(clusterUrl.trim());

    const newCloud = new Cloud(normUrl);
    newCloud.name = clusterName;
    newCloud.offlineAccess = offlineAccess;
    newCloud.trustHost = trustHost;

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
          loading={loading}
          loaded={!!cloud}
          connectError={cloud?.connectError}
          onClusterConnect={handleClusterConnect}
        />
        {loading ? (
          <Spinner />
        ) : (
          dataCloud &&
          !dataCloud.error && (
            <SynchronizeBlock dataCloud={dataCloud} onAdd={onAdd} />
          )
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
