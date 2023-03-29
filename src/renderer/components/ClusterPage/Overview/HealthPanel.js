import propTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { useClouds } from '../../../store/CloudProvider';
import { CONNECTION_STATUSES } from '../../../../common/Cloud';
import {
  getCpuMetrics,
  getMemoryMetrics,
  getDiskMetrics,
} from '../../../../api/metricApi';
import { netErrorTypes, getNetErrorType } from '../../../../util/netUtil';
import { useCloudConnection } from '../useCloudConnection';
import { PanelTitle } from '../PanelTitle';
import { DrawerTitleWrapper, Link } from '../clusterPageComponents';
import { SingleMetric } from './SingleMetric';
import { MetricTitle } from './MetricTitle';
import { InlineNotice, types } from '../../InlineNotice';
import { layout } from '../../styles';
import { logger, logValue } from '../../../../util/logger';
import * as strings from '../../../../strings';
import { entityLabels } from '../../../../catalog/catalogEntities';

const UPDATE_METRICS_INTERVAL = 60000; // 60000ms = 1min

/**
 * Converts size in bytes to KB, MB, GB etc.
 * @param {number} bytes The size in bytes. If not a number, treated as "no bytes" vs "0 bytes".
 * @param {number} decimals The number of characters after the period.
 * @returns {string} `--` if no bytes provided, formatted size in other case.
 */
const formatBytes = (bytes, decimals = 2) => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) {
    return strings.catalog.entities.common.details.emptyValue();
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = [
    strings.clusterPage.pages.overview.health.metrics.sizes.bytes(),
    strings.clusterPage.pages.overview.health.metrics.sizes.kb(),
    strings.clusterPage.pages.overview.health.metrics.sizes.mb(),
    strings.clusterPage.pages.overview.health.metrics.sizes.gb(),
    strings.clusterPage.pages.overview.health.metrics.sizes.tb(),
    strings.clusterPage.pages.overview.health.metrics.sizes.pb(),
    strings.clusterPage.pages.overview.health.metrics.sizes.eb(),
    strings.clusterPage.pages.overview.health.metrics.sizes.zb(),
    strings.clusterPage.pages.overview.health.metrics.sizes.yb(),
  ];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

/**
 * Converts decimal numbers to percentages.
 * @param {number} pct decimal number.
 * @returns {string} `--` if no number provided, formatted percentage in other case.
 */
const formatPct = (pct) => {
  return typeof pct === 'number' && !Number.isNaN(pct)
    ? strings.clusterPage.pages.overview.health.metrics.cpu.percentageValue(
        Math.round(pct * 100)
      )
    : strings.catalog.entities.common.details.emptyValue();
};

/**
 * Creates array with objects of CPU metrics for future render.
 * @param {Object} obj CPU metrics values.
 * @param {number} obj.used Used value from CPU metrics.
 * @param {number} obj.system System value from CPU metrics.
 * @param {number} obj.io I/O value from CPU metrics.
 * @param {number} obj.idle Idle value from CPU metrics.
 * @returns {Array<{ label: string, value: string}>} array with objects of CPU metrics.
 */
const getCpuData = ({ used, system, io, idle }) => {
  return [
    {
      label: strings.clusterPage.pages.overview.health.metrics.cpu.used(),
      value: formatPct(used),
    },
    {
      label: strings.clusterPage.pages.overview.health.metrics.cpu.system(),
      value: formatPct(system),
    },
    {
      label: strings.clusterPage.pages.overview.health.metrics.cpu.io(),
      value: formatPct(io),
    },
    {
      label: strings.clusterPage.pages.overview.health.metrics.cpu.idle(),
      value: formatPct(idle),
    },
  ];
};

/**
 * Creates array with objects of Memory metrics for future render.
 * @param {Object} obj Memory metrics values.
 * @param {number} obj.available Available memory value from Memory metrics.
 * @param {number} obj.capacity Capacity value from Memory metrics.
 * @param {number} obj.allocated Allocated memory value from Memory metrics.
 * @returns {Array<{ label: string, value: string}>} array with objects of Memory metrics.
 */
const getMemoryData = ({ available, capacity, allocated }) => {
  return [
    {
      label:
        strings.clusterPage.pages.overview.health.metrics.memory.available(),
      value: formatBytes(available),
    },
    {
      label:
        strings.clusterPage.pages.overview.health.metrics.memory.capacity(),
      value: formatBytes(capacity),
    },
    {
      label:
        strings.clusterPage.pages.overview.health.metrics.memory.allocated(),
      value: formatBytes(allocated),
    },
  ];
};

/**
 * Creates array with objects of Storage metrics for future render.
 * @param {Object} obj Storage metrics values.
 * @param {number} obj.used Used storage value from Storage metrics.
 * @param {number} obj.capacity Capacity value from Storage metrics.
 * @param {number} obj.available Available storage value from Storage metrics.
 * @returns {Array<{ label: string, value: string}>} array with objects of Storage metrics.
 */
const getStorageData = ({ used, capacity, available }) => {
  return [
    {
      label: strings.clusterPage.pages.overview.health.metrics.storage.used(),
      value: formatBytes(used),
    },
    {
      label:
        strings.clusterPage.pages.overview.health.metrics.storage.capacity(),
      value: formatBytes(capacity),
    },
    {
      label:
        strings.clusterPage.pages.overview.health.metrics.storage.available(),
      value: formatBytes(available),
    },
  ];
};

//
// INTERNAL STYLED COMPONENTS
//

const ReconnectButton = styled.button`
  color: var(--primary);
  padding-left: ${layout.pad / 2}px;
`;

const ErrorMessage = styled(InlineNotice)`
  padding: ${layout.pad * 2.25}px ${layout.pad * 2.75}px ${layout.pad * 1.5}px;
  background-color: var(--contentColor);

  ol {
    list-style: decimal;
    padding-left: ${layout.pad * 2}px;
    padding-top: ${layout.pad * 2}px;
  }
`;

const MetricsWrapper = styled.div`
  display: flex;
  padding: ${layout.pad * 3}px 0;
  background-color: var(--contentColor);
  height: 100%;
`;

const MetricItem = styled.div`
  display: flex;
  flex-direction: column;
  width: calc(100% / 3);
  padding: 0 ${layout.pad * 3}px;

  &:not(:last-of-type) {
    border-right: 1px solid var(--borderFaintColor);
  }
`;

export const HealthPanel = ({ clusterEntity }) => {
  const { clouds } = useClouds();
  const { cloudStatus, handleReconnectCloud } = useCloudConnection(
    clusterEntity.metadata.cloudUrl
  );

  const [hasPromUrl, setHasPromUrl] = useState(true);
  const [cpuMetrics, setCpuMetrics] = useState(null);
  const [memoryMetrics, setMemoryMetrics] = useState(null);
  const [storageMetrics, setStorageMetrics] = useState(null);
  const [cpuData, setCpuData] = useState([]);
  const [memoryData, setMemoryData] = useState([]);
  const [storageData, setStorageData] = useState([]);
  const [cpuPercentage, setCpuPercentage] = useState(0);
  const [memoryPercentage, setMemoryPercentage] = useState(0);
  const [storagePercentage, setStoragePercentage] = useState(0);
  const [timerTrigger, setTimerTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showFullFetchError, setShowFullFetchError] = useState(false);

  // {string|null|undefined} one of the `netErrorTypes` enum values; null if none;
  //  undefined if the error is unknown
  const [fetchErrorType, setFetchErrorType] = useState(null);

  const promUrl = clusterEntity.spec.lma?.prometheusUrl || '';
  const cloud = clouds[clusterEntity.metadata.cloudUrl];

  useEffect(() => {
    if (cloudStatus !== CONNECTION_STATUSES.CONNECTING) {
      setIsLoading(false);
    }
  }, [cloudStatus]);

  useEffect(() => {
    let timeoutId;

    /**
     * Gets CPU, Memory and Storage metrics from Prometheus.
     * @param {Object} cloud Cloud.
     */
    const getMetrics = async () => {
      let keepData = false;

      if (promUrl) {
        setHasPromUrl(true);

        const [cpuDataRes, memoryDataRes, storageDataRes] =
          await Promise.allSettled([
            getCpuMetrics(cloud, promUrl),
            getMemoryMetrics(cloud, promUrl),
            getDiskMetrics(cloud, promUrl),
          ]);

        let cpuErrorType;
        if (cpuDataRes.status === 'fulfilled') {
          setCpuMetrics(cpuDataRes.value);
        } else {
          cpuErrorType = getNetErrorType(cpuDataRes.reason);
          setCpuMetrics({});
          logger.error(
            'HealthPanel.useEffect.getMetrics()',
            `Failed to get CPU metrics; error=${logValue(cpuDataRes.reason)}`
          );
        }

        let memoryErrorType;
        if (memoryDataRes.status === 'fulfilled') {
          setMemoryMetrics(memoryDataRes.value);
        } else {
          memoryErrorType = getNetErrorType(memoryDataRes.reason);
          setMemoryMetrics({});
          logger.error(
            'HealthPanel.useEffect.getMetrics()',
            `Failed to get Memory metrics; error=${logValue(
              memoryDataRes.reason
            )}`
          );
        }

        let storageErrorType;
        if (storageDataRes.status === 'fulfilled') {
          setStorageMetrics(storageDataRes.value);
        } else {
          storageErrorType = getNetErrorType(storageDataRes.reason);
          setStorageMetrics({});
          logger.error(
            'HealthPanel.useEffect.getMetrics()',
            `Failed to get Storage metrics; error=${logValue(
              storageDataRes.reason
            )}`
          );
        }

        const handledErrors = [
          netErrorTypes.CERT_VERIFICATION,
          netErrorTypes.HOST_NOT_FOUND,
        ];
        if (
          handledErrors.includes(cpuErrorType) ||
          handledErrors.includes(memoryErrorType) ||
          handledErrors.includes(storageErrorType)
        ) {
          // any one of the known network error types for one fetch likely means every fetch
          //  failed the same way since they're all going to the same endpoint
          const errorTypes = [cpuErrorType, memoryErrorType, storageErrorType];

          // in order of precedence (worst to least)
          if (errorTypes.includes(netErrorTypes.HOST_NOT_FOUND)) {
            setFetchErrorType(netErrorTypes.HOST_NOT_FOUND);
          } else {
            setFetchErrorType(netErrorTypes.CERT_VERIFICATION);
          }

          setShowFullFetchError(false); // reset as error may have changed
        } else if (
          cpuDataRes.reason &&
          memoryDataRes.reason &&
          storageDataRes.reason
        ) {
          // all 3 types of fetches failed for some unknown reason
          keepData = false;
          setFetchErrorType(undefined);
          setShowFullFetchError(false);
        } else {
          // one or more metrics may have failed, but since we don't specifically handle the
          //  reason why, we keep whatever data we may have and try again later
          keepData = true;
          setFetchErrorType(null);
          setShowFullFetchError(false);

          // refresh at next interval
          timeoutId = setTimeout(() => {
            setTimerTrigger(timerTrigger + 1);
          }, UPDATE_METRICS_INTERVAL);
        }
      } else {
        setHasPromUrl(false);
      }

      if (!keepData) {
        setCpuMetrics({});
        setMemoryMetrics({});
        setStorageMetrics({});
      }
    };

    getMetrics();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [cloud, promUrl, timerTrigger, cloudStatus]);

  useEffect(() => {
    if (cpuMetrics) {
      setCpuData(
        getCpuData({
          used: cpuMetrics.usagePct,
          system: cpuMetrics.systemPct,
          io: cpuMetrics.ioPct,
          idle: cpuMetrics.idlePct,
        })
      );
      setCpuPercentage(
        cpuMetrics.usagePct && !isLoading
          ? Math.round(cpuMetrics.usagePct * 100)
          : 0
      );
    }
  }, [cpuMetrics, isLoading]);

  useEffect(() => {
    if (memoryMetrics) {
      setMemoryData(
        getMemoryData({
          available: memoryMetrics.availableByte,
          capacity: memoryMetrics.capacityByte,
          allocated: memoryMetrics.allocatedByte,
        })
      );
      setMemoryPercentage(
        memoryMetrics.availableByte && memoryMetrics.capacityByte && !isLoading
          ? Math.round(
              (memoryMetrics.availableByte / memoryMetrics.capacityByte) * 100
            )
          : 0
      );
    }
  }, [memoryMetrics, isLoading]);

  useEffect(() => {
    if (storageMetrics) {
      setStorageData(
        getStorageData({
          used: storageMetrics.usedByte,
          capacity: storageMetrics.capacityByte,
          available: storageMetrics.availableByte,
        })
      );
      setStoragePercentage(
        storageMetrics.usedByte && storageMetrics.capacityByte && !isLoading
          ? Math.round(
              (storageMetrics.usedByte / storageMetrics.capacityByte) * 100
            )
          : 0
      );
    }
  }, [storageMetrics, isLoading]);

  const handleReconnect = useCallback(() => {
    setIsLoading(true);
    handleReconnectCloud();
  }, [handleReconnectCloud]);

  const handleShowMoreClick = useCallback(
    (event) => {
      event.preventDefault();
      setShowFullFetchError(!showFullFetchError);
    },
    [showFullFetchError]
  );

  const cloudName = clusterEntity.metadata.labels[entityLabels.CLOUD];
  const cloudConnected = cloudStatus !== CONNECTION_STATUSES.DISCONNECTED;

  return (
    <>
      <DrawerTitleWrapper>
        <PanelTitle title={strings.clusterPage.pages.overview.health.title()} />
      </DrawerTitleWrapper>
      {!hasPromUrl ? (
        <ErrorMessage type={types.ERROR}>
          <p>
            {strings.clusterPage.pages.overview.health.metrics.error.noMetrics.title()}
          </p>
          <ol>
            {strings.clusterPage.pages.overview.health.metrics.error.noMetrics
              .reasonsList()
              .map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
          </ol>
        </ErrorMessage>
      ) : null}
      {hasPromUrl && !cloudConnected ? (
        <ErrorMessage type={types.ERROR}>
          <p>
            {strings.clusterPage.pages.overview.health.metrics.error.disconnectedManagementCluster.title()}
            <ReconnectButton onClick={handleReconnect}>
              {strings.clusterPage.pages.overview.health.metrics.error.disconnectedManagementCluster.reconnectButtonLabel()}
            </ReconnectButton>
          </p>
        </ErrorMessage>
      ) : null}
      {hasPromUrl &&
      cloudConnected &&
      fetchErrorType === netErrorTypes.HOST_NOT_FOUND ? (
        <ErrorMessage type={types.ERROR}>
          <p>
            {strings.clusterPage.pages.overview.health.metrics.error.hostNotFound.title(
              promUrl
            )}{' '}
            {showFullFetchError
              ? strings.clusterPage.pages.overview.health.metrics.error.hostNotFound.more()
              : null}{' '}
            <Link href="#" onClick={handleShowMoreClick}>
              {showFullFetchError
                ? strings.clusterPage.pages.overview.health.showLess()
                : strings.clusterPage.pages.overview.health.showMore()}
            </Link>
          </p>
        </ErrorMessage>
      ) : null}
      {hasPromUrl &&
      cloudConnected &&
      fetchErrorType === netErrorTypes.CERT_VERIFICATION ? (
        <ErrorMessage type={types.ERROR}>
          <p>
            {strings.clusterPage.pages.overview.health.metrics.error.untrustedCertificate.title(
              promUrl
            )}{' '}
            {showFullFetchError
              ? strings.clusterPage.pages.overview.health.metrics.error.untrustedCertificate.more(
                  cloudName
                )
              : null}{' '}
            <Link href="#" onClick={handleShowMoreClick}>
              {showFullFetchError
                ? strings.clusterPage.pages.overview.health.showLess()
                : strings.clusterPage.pages.overview.health.showMore()}
            </Link>
          </p>
        </ErrorMessage>
      ) : null}
      {hasPromUrl && cloudConnected && fetchErrorType === undefined ? (
        <ErrorMessage type={types.ERROR}>
          <p>
            {strings.clusterPage.pages.overview.health.metrics.error.unknownError.title()}
          </p>
        </ErrorMessage>
      ) : null}
      <MetricsWrapper>
        <MetricItem>
          <MetricTitle
            title={strings.clusterPage.pages.overview.health.metrics.cpu.title()}
            tooltipText={
              !hasPromUrl
                ? ''
                : strings.clusterPage.pages.overview.health.metrics.cpu.tooltipInfoHtml()
            }
          />
          <SingleMetric
            chartColor="--blue"
            chartFillPercentage={cpuPercentage}
            info={cpuData}
            isUpdating={isLoading}
          />
        </MetricItem>
        <MetricItem>
          <MetricTitle
            title={strings.clusterPage.pages.overview.health.metrics.memory.title()}
            tooltipText={
              !hasPromUrl
                ? ''
                : strings.clusterPage.pages.overview.health.metrics.memory.tooltipInfoHtml()
            }
          />
          <SingleMetric
            chartColor="--magenta"
            chartFillPercentage={memoryPercentage}
            info={memoryData}
            isUpdating={isLoading}
          />
        </MetricItem>
        <MetricItem>
          <MetricTitle
            title={strings.clusterPage.pages.overview.health.metrics.storage.title()}
            tooltipText={
              !hasPromUrl
                ? ''
                : strings.clusterPage.pages.overview.health.metrics.storage.tooltipInfoHtml()
            }
          />
          <SingleMetric
            chartColor="--golden"
            chartFillPercentage={storagePercentage}
            info={storageData}
            isUpdating={isLoading}
          />
        </MetricItem>
      </MetricsWrapper>
    </>
  );
};

HealthPanel.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
