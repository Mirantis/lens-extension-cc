import propTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useThemeSwitching } from '../../hooks/useThemeSwitching';

ChartJS.register(ArcElement);

const getData = (color, percentage) => {
  const style = getComputedStyle(document.body);

  return {
    datasets: [
      {
        data: [percentage, 100 - percentage],
        backgroundColor: [
          style.getPropertyValue(color),
          style.getPropertyValue('--borderFaintColor'),
        ],
        borderColor: [
          style.getPropertyValue(color),
          style.getPropertyValue('--borderFaintColor'),
        ],
      },
    ],
  };
};

const getDefaultData = () => {
  const style = getComputedStyle(document.body);

  return {
    datasets: [
      {
        data: [0, 100],
        backgroundColor: [
          style.getPropertyValue('--borderFaintColor'),
          style.getPropertyValue('--borderFaintColor'),
        ],
        borderColor: [
          style.getPropertyValue('--borderFaintColor'),
          style.getPropertyValue('--borderFaintColor'),
        ],
      },
    ],
  };
};

const options = {
  circumference: 220,
  rotation: 250,
  cutout: '93%',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: false,
    },
  },
};

export const MetricChart = ({ chartColor, chartFillPercentage }) => {
  const [chartData, setChartData] = useState(getDefaultData());
  const { theme } = useThemeSwitching();

  useEffect(() => {
    setChartData(getData(chartColor, chartFillPercentage));
  }, [chartColor, chartFillPercentage, theme.mode]);

  return <Doughnut data={chartData} options={options} />;
};

MetricChart.propTypes = {
  chartColor: propTypes.string.isRequired,
  chartFillPercentage: propTypes.number.isRequired,
};
