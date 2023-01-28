import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { MetricChart } from './MetricChart';
import { layout } from '../../styles';
import { Loader } from '../../Loader';
import * as strings from '../../../../strings';

//
// INTERNAL STYLED COMPONENTS
//

const ChartWrapper = styled.div`
  position: relative;
  margin: ${layout.pad * 4}px 0 ${layout.pad * 5}px;
  pointer-events: none;
`;

const PercentageValue = styled.div(({ color }) => ({
  fontSize: 'calc(var(--font-size) * 1.6)',
  fontWeight: 'bold',
  color: `var(${color})`,
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translateX(-50%)',
}));

const Info = styled.div`
  display: flex;
  flex-wrap: wrap;

  &:not(:last-of-type) {
    margin-bottom: ${layout.pad * 3}px;
  }

  p {
    margin-right: ${layout.pad}px;
  }
`;

const LoaderWrapper = styled.div`
  text-align: center;
`;

export const SingleMetric = ({
  chartColor,
  chartFillPercentage,
  info,
  isUpdating,
}) => {
  return (
    <>
      <div>
        <ChartWrapper>
          <MetricChart
            chartColor={chartColor}
            chartFillPercentage={chartFillPercentage}
          />
          <PercentageValue color={chartColor}>
            {strings.clusterPage.pages.overview.health.metrics.chart.chartFillPercentage(
              chartFillPercentage
            )}
          </PercentageValue>
        </ChartWrapper>
        {!isUpdating && info.length > 0 ? (
          info.map((item, index) => (
            <Info key={index}>
              <p>{item.label}</p>
              <p>{item.value}</p>
            </Info>
          ))
        ) : (
          <LoaderWrapper>
            <Loader />
          </LoaderWrapper>
        )}
      </div>
    </>
  );
};

SingleMetric.propTypes = {
  chartColor: propTypes.string.isRequired,
  chartFillPercentage: propTypes.number.isRequired,
  info: propTypes.arrayOf(
    propTypes.shape({
      label: propTypes.string,
      value: propTypes.string,
    })
  ).isRequired,
  isUpdating: propTypes.bool.isRequired,
};
