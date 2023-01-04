import propTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement);

const style = getComputedStyle(document.body);

const getData = (color, percentage) => {
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

const defaultData = {
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
  const [chartData, setChartData] = useState(defaultData);

  useEffect(() => {
    setChartData(getData(chartColor, chartFillPercentage));
  }, [chartColor, chartFillPercentage]);

  return <Doughnut data={chartData} options={options} />;
};

MetricChart.propTypes = {
  chartColor: propTypes.string.isRequired,
  chartFillPercentage: propTypes.number.isRequired,
};
