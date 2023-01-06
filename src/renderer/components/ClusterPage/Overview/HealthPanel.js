import propTypes from 'prop-types';
import { useState, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { useClouds } from '../../../store/CloudProvider';
import {
  getCpuMetrics,
  getMemoryMetrics,
  getDiskMetrics,
} from '../../../../api/metricApi';
import { PanelTitle } from '../PanelTitle';
import { DrawerTitleWrapper } from '../clusterPageComponents';
import { SingleMetric } from './SingleMetric';
import { MetricTitle } from './MetricTitle';
import { layout } from '../../styles';
import { logger } from '../../../../util/logger';
import * as strings from '../../../../strings';

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
      value:
        typeof used === 'number' && !Number.isNaN(used)
          ? strings.clusterPage.pages.overview.health.metrics.cpu.percentageValue(
              Math.round(used * 100)
            )
          : strings.catalog.entities.common.details.emptyValue(),
    },
    {
      label: strings.clusterPage.pages.overview.health.metrics.cpu.system(),
      value:
        typeof system === 'number' && !Number.isNaN(system)
          ? strings.clusterPage.pages.overview.health.metrics.cpu.percentageValue(
              Math.round(system * 100)
            )
          : strings.catalog.entities.common.details.emptyValue(),
    },
    {
      label: strings.clusterPage.pages.overview.health.metrics.cpu.io(),
      value:
        typeof io === 'number' && !Number.isNaN(io)
          ? strings.clusterPage.pages.overview.health.metrics.cpu.percentageValue(
              Math.round(io * 100)
            )
          : strings.catalog.entities.common.details.emptyValue(),
    },
    {
      label: strings.clusterPage.pages.overview.health.metrics.cpu.idle(),
      value:
        typeof idle === 'number' && !Number.isNaN(idle)
          ? strings.clusterPage.pages.overview.health.metrics.cpu.percentageValue(
              Math.round(idle * 100)
            )
          : strings.catalog.entities.common.details.emptyValue(),
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

const MetricsWrapper = styled.div`
  display: flex;
  padding: ${layout.pad * 3}px 0;
  background-color: var(--contentColor);
`;

const MetricItem = styled.div`
  display: flex;
  flex-direction: column;
  width: calc(100% / 3);
  padding: 0 ${layout.pad * 6.5}px;

  &:not(:last-of-type) {
    border-right: 1px solid var(--borderFaintColor);
  }
`;

export const HealthPanel = ({ clusterEntity }) => {
  const mounted = useRef(false);
  const { clouds } = useClouds();
  const [cpuMetrics, setCpuMetrics] = useState(null);
  const [memoryMetrics, setMemoryMetrics] = useState(null);
  const [storageMetrics, setStorageMetrics] = useState(null);
  const [cpuData, setCpuData] = useState([]);
  const [memoryData, setMemoryData] = useState([]);
  const [storageData, setStorageData] = useState([]);
  const [cpuPercentage, setCpuPercentage] = useState(0);
  const [memoryPercentage, setMemoryPercentage] = useState(0);
  const [storagePercentage, setStoragePercentage] = useState(0);
  const [updateMetricsTimeoutId, setUpdateMetricsTimeoutId] = useState(null);
  const [timerTrigger, setTimerTrigger] = useState(0);

  // Canceling the timeout if the component gets unmounted
  useEffect(() => {
    mounted.current = true;

    return () => {
      clearTimeout(updateMetricsTimeoutId);
      mounted.current = false;
    };
  }, [updateMetricsTimeoutId]);

  useEffect(() => {
    /**
     * Gets CPU, Memory and Storage metrics from Prometheus.
     * @param {Object} cloud Cloud.
     */
    const getMetrics = async (cloud) => {
      const promUrl = clusterEntity.spec.lma.prometheusUrl;

      if (promUrl) {
        try {
          const metrics = await getCpuMetrics(cloud, promUrl);
          setCpuMetrics(metrics);
        } catch (err) {
          logger.error(err.message);
          setCpuMetrics({});
        }

        try {
          const metrics = await getMemoryMetrics(cloud, promUrl);
          setMemoryMetrics(metrics);
        } catch (err) {
          logger.error(err.message);
          setMemoryMetrics({});
        }

        try {
          const metrics = await getDiskMetrics(cloud, promUrl);
          setStorageMetrics(metrics);
        } catch (err) {
          logger.error(err.message);
          setStorageMetrics({});
        }

        // Changes timer trigger every minute to update metrics.
        setUpdateMetricsTimeoutId(
          setTimeout(() => {
            setTimerTrigger(timerTrigger + 1);
          }, UPDATE_METRICS_INTERVAL)
        );
      } else {
        setCpuMetrics({});
        setMemoryMetrics({});
        setStorageMetrics({});
      }
    };

    getMetrics(clouds[clusterEntity.metadata.cloudUrl]);
  }, [clouds, clusterEntity, timerTrigger]);

  useEffect(() => {
    if (cpuMetrics !== null) {
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
          cpuMetrics.usagePct ? Math.round(cpuMetrics.usagePct * 100) : 0
        );
      } else {
        setCpuData(getCpuData());
      }
    }
  }, [cpuMetrics]);

  useEffect(() => {
    if (memoryMetrics !== null) {
      if (memoryMetrics) {
        setMemoryData(
          getMemoryData({
            available: memoryMetrics.availableByte,
            capacity: memoryMetrics.capacityByte,
            allocated: memoryMetrics.allocatedByte,
          })
        );
        setMemoryPercentage(
          memoryMetrics.availableByte && memoryMetrics.capacityByte
            ? Math.round(
                (memoryMetrics.availableByte / memoryMetrics.capacityByte) * 100
              )
            : 0
        );
      } else {
        setMemoryData(getMemoryData());
      }
    }
  }, [memoryMetrics]);

  useEffect(() => {
    if (storageMetrics !== null) {
      if (storageMetrics) {
        setStorageData(
          getStorageData({
            used: storageMetrics.usedByte,
            capacity: storageMetrics.capacityByte,
            available: storageMetrics.availableByte,
          })
        );
        setStoragePercentage(
          storageMetrics.usedByte && storageMetrics.capacityByte
            ? Math.round(
                (storageMetrics.usedByte / storageMetrics.capacityByte) * 100
              )
            : 0
        );
      } else {
        setStorageData(getStorageData());
      }
    }
  }, [storageMetrics]);

  return (
    <>
      <DrawerTitleWrapper>
        <PanelTitle title={strings.clusterPage.pages.overview.health.title()} />
      </DrawerTitleWrapper>
      <MetricsWrapper>
        <MetricItem>
          <MetricTitle
            title={strings.clusterPage.pages.overview.health.metrics.cpu.title()}
            tooltipText={strings.clusterPage.pages.overview.health.metrics.cpu.tooltipInfoHtml()}
          />
          <SingleMetric
            chartColor="--blue"
            chartFillPercentage={cpuPercentage}
            info={cpuData}
          />
        </MetricItem>
        <MetricItem>
          <MetricTitle
            title={strings.clusterPage.pages.overview.health.metrics.memory.title()}
            tooltipText={strings.clusterPage.pages.overview.health.metrics.memory.tooltipInfoHtml()}
          />
          <SingleMetric
            chartColor="--magenta"
            chartFillPercentage={memoryPercentage}
            info={memoryData}
          />
        </MetricItem>
        <MetricItem>
          <MetricTitle
            title={strings.clusterPage.pages.overview.health.metrics.storage.title()}
            tooltipText={strings.clusterPage.pages.overview.health.metrics.storage.tooltipInfoHtml()}
          />
          <SingleMetric
            chartColor="--golden"
            chartFillPercentage={storagePercentage}
            info={storageData}
          />
        </MetricItem>
      </MetricsWrapper>
    </>
  );
};

HealthPanel.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
