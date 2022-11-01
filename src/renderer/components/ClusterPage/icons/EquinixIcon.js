import propTypes from 'prop-types';

export const EquinixIcon = function ({ size, fill, ...svgProps }) {
  return (
    <svg
      width={size}
      viewBox="0 0 20 13"
      fill="none"
      style={{ ...svgProps?.style }}
    >
      <path
        d="M20 3.47208V9.75L15.9978 11.1367V3.48833L14.6692 3.02792V11.6079L10.667 13V1.625L9.99728 1.39208L9.33297 1.625V13L5.33624 11.6079V3.02792L4.00218 3.48833V11.1475L0 9.75V3.47208L1.33406 3.01167V8.81833L2.66812 9.27875V2.54583L6.66485 1.15917V10.6708L7.99891 11.1312V0.693333L9.99728 0L11.9793 0.693333V11.1312L13.3079 10.6708V1.15917L17.3319 2.54583V9.27875L18.6659 8.81833V3.01167L20 3.47208Z"
        fill={fill}
      />
    </svg>
  );
};

EquinixIcon.propTypes = {
  size: propTypes.number, // pixels
  fill: propTypes.string, // CSS value
};

EquinixIcon.defaultProps = {
  size: 16,

  // NOTE: this is a valid CSS color value that will reference the nearest `color`
  //  style's value in the cascading chain
  fill: 'currentColor',
};
