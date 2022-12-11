import { useState, useEffect } from 'react';
import { useClouds } from '../../store/CloudProvider';
import { CLOUD_EVENTS } from '../../../common/Cloud';

/**
 * Listens for fetching and cloud statuses during synchronization.
 * @param {string} cloudUrl Cloud url which is used for syncing.
 * @returns {{ isCloudFetching: boolean, cloudStatus: string }} fetching and cloud statuses.
 */
export const useCloudSync = (cloudUrl) => {
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

  return { isCloudFetching, cloudStatus };
};
