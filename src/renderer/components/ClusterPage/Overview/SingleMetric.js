import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { MetricChart } from './MetricChart';
import { layout } from '../../styles';
import { Loader } from '../../Loader';

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
  justify-content: center;
  width: ${layout.grid * 52.5}px;
  margin: 0 auto;

  &:not(:last-of-type) {
    margin-bottom: ${layout.pad * 3}px;
  }

  p {
    width: 50%;
  }
`;

const LoaderWrapper = styled.div`
  text-align: center;
`;

export const SingleMetric = ({ chartColor, chartFillPercentage, info }) => {
  return (
    <>
      <div>
        <ChartWrapper>
          <MetricChart
            chartColor={chartColor}
            chartFillPercentage={chartFillPercentage}
          />
          <PercentageValue color={chartColor}>
            {chartFillPercentage}%
          </PercentageValue>
        </ChartWrapper>
        {info.length > 0 ? (
          info.map((item, infoIndex) =>
            Object.keys(item).map((key, keyIndex) => (
              <Info key={`${infoIndex}-${keyIndex}`}>
                <p>{key}</p>
                <p>{item[key]}</p>
              </Info>
            ))
          )
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
  info: propTypes.arrayOf(propTypes.object).isRequired,
};
