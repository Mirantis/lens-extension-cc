import { useState, useEffect, useCallback } from 'react';
import { useClouds } from '../../store/CloudProvider';
import { CLOUD_EVENTS } from '../../../common/Cloud';
import { IpcRenderer } from '../../IpcRenderer';
import * as consts from '../../../constants';

/**
 * Listens for fetching and cloud statuses during synchronization/connecting.
 * @param {string} cloudUrl Cloud url which is used for syncing.
 * @returns {{ isCloudFetching: boolean, cloudStatus: string, handleSyncCloud: Function, handleSyncCloud: Function }} fetching and cloud statuses, start sync method, start reconnect method.
 */
export const useCloudConnection = (cloudUrl) => {
  const { clouds } = useClouds();

  const [isCloudFetching, setIsCloudFetching] = useState(false);
  const [cloudStatus, setCloudStatus] = useState(clouds[cloudUrl].status);

  useEffect(() => {
    const onCloudFetchingChange = () => {
      setIsCloudFetching(clouds[cloudUrl].fetching);
      setCloudStatus(clouds[cloudUrl].status);
    };

    const onCloudStatusChange = () => {
      setIsCloudFetching(clouds[cloudUrl].fetching);
      setCloudStatus(clouds[cloudUrl].status);
    };

    // Listen fetching status
    clouds[cloudUrl].addEventListener(
      CLOUD_EVENTS.FETCHING_CHANGE,
      onCloudFetchingChange
    );
    clouds[cloudUrl].addEventListener(
      CLOUD_EVENTS.STATUS_CHANGE,
      onCloudStatusChange
    );

    return () => {
      clouds[cloudUrl].removeEventListener(
        CLOUD_EVENTS.FETCHING_CHANGE,
        onCloudFetchingChange
      );
      clouds[cloudUrl].removeEventListener(
        CLOUD_EVENTS.STATUS_CHANGE,
        onCloudStatusChange
      );
    };
  }, [clouds, cloudUrl]);

  const handleSyncCloud = useCallback(() => {
    IpcRenderer.getInstance().invoke(
      consts.ipcEvents.invoke.SYNC_NOW,
      cloudUrl
    );
  }, [cloudUrl]);

  const handleReconnectCloud = useCallback(() => {
    IpcRenderer.getInstance().invoke(
      consts.ipcEvents.invoke.RECONNECT,
      cloudUrl
    );
  }, [cloudUrl]);

  return {
    isCloudFetching,
    cloudStatus,
    handleSyncCloud,
    handleReconnectCloud,
  };
};
