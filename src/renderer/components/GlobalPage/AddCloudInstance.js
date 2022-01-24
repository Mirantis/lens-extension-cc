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

const {
  Component: { Notifications },
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

export const AddCloudInstance = ({ onCancel }) => {
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
          EXTENDED_CLOUD_EVENTS.LOADING_CHANGE,
          loadingListener
        );
      }
      setLoading(extCl.loading);
    };

    extCl.addEventListener(
      EXTENDED_CLOUD_EVENTS.LOADING_CHANGE,
      loadingListener
    );
  }, [extCloud, cloud]);

  const cleanCloudsState = () => {
    setCloud(null);
    setExtCloud(null);
  };

  useEffect(() => {
    if (cloud && !loading && !extCloud) {
      makeExtCloud();
    }
  }, [cloud, loading, extCloud, makeExtCloud]);

  return (
    <PageContainer>
      <MainColumn>
        <ConnectionBlock
          setCloud={setCloud}
          extCloudLoading={loading}
          cleanCloudsState={cleanCloudsState}
        />
        <SynchronizeBlock extCloud={extCloud} />
      </MainColumn>
      <EscColumn>
        <CloseButton onClick={onCancel} />
      </EscColumn>
    </PageContainer>
  );
};

AddCloudInstance.propTypes = {
  onCancel: PropTypes.func.isRequired,
};
