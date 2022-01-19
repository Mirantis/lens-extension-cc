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
  };
});

export const AddCloudInstance = ({ onCancel }) => {
  const [cloud, setCloud] = useState(null);
  const [extCloud, setExtCloud] = useState(null);
  const [loading, setLoading] = useState(false);

  const makeExtCloud = useCallback(async () => {
    setLoading(true);
    // create extendedCloud. This `extCl` doesn't contain namespaces yep
    // we need to fetch all additional data (namespaces, credentials, sshKeys) using extCloud.init() method
    const extCl = new ExtendedCloud(cloud);

    const loadingListener = () => {
      setLoading(extCl.loading);
      if (extCloud && !extCloud.loading) {
        extCl.removeEventListener(
          EXTENDED_CLOUD_EVENTS.LOADING_CHANGE,
          loadingListener
        );
      }
    };

    extCl.addEventListener(
      EXTENDED_CLOUD_EVENTS.LOADING_CHANGE,
      loadingListener
    );

    try {
      // update extendedCloud:   add namespaces and all needed data
      // and set it to local state as `extCloud`
      await extCl.init(true);
      setExtCloud(extCl);
    } catch (err) {
      Notifications.error(err.message);
    }
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
        <SynchronizeBlock cloud={cloud} />
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
