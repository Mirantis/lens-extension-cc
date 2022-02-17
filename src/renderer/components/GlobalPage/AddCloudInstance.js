import styled from '@emotion/styled';
import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { layout } from '../styles';
import { ConnectionBlock } from './ConnectionBlock';
import { SynchronizeBlock } from './SynchronizeBlock';
import { CloseButton } from '../CloseButton/CloseButton';
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

export const AddCloudInstance = ({ onAdd, onCancel }) => {
  const [cloud, setCloud] = useState(null);
  const [extCloud, setExtCloud] = useState(null);
  const [loading, setLoading] = useState(false);

  const makeExtCloud = useCallback(() => {
    setLoading(true);

    // just use a minimal preview instance since it's throw-away
    const extCl = new ExtendedCloud(cloud, true);

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

  const checkConnectionError = () => {
    Notifications.error(addCloudInstance.connectionError());
  };

  const handleClusterConnect = async function (clusterUrl, clusterName) {
    cleanCloudsState();
    const normUrl = normalizeUrl(clusterUrl.trim());
    setLoading(true);
    let newCloud = new Cloud();
    newCloud.cloudUrl = normUrl;
    newCloud.name = clusterName;
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
          checkConnectionError();
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
          handleClusterConnect={handleClusterConnect}
        />
        {loading ? (
          <Spinner />
        ) : (
          extCloud &&
          !extCloud.error && (
            <SynchronizeBlock extendedCloud={extCloud} onAdd={onAdd} />
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
