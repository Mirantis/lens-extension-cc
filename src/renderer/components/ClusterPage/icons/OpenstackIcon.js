import propTypes from 'prop-types';

export const OpenstackIcon = function ({ size, fill, ...svgProps }) {
  return (
    <svg
      width={size}
      viewBox="0 0 14 14"
      fill="none"
      style={{ ...svgProps?.style }}
    >
      <path
        d="M0 10H2.5V10.4C2.5 10.967 2.92901 11.4338 3.48014 11.4935L3.6 11.5H10.4C10.967 11.5 11.4338 11.071 11.4935 10.5199L11.5 10.4V10H14V12.5C14 13.3284 13.3284 14 12.5 14H1.5C0.671573 14 0 13.3284 0 12.5V10ZM14 9H11.5V5H14V9ZM0 5H2.5V9H0V5ZM14 1.5V4H11.5V3.6C11.5 3.03299 11.071 2.56618 10.5199 2.50645L10.4 2.5H3.6C3.03299 2.5 2.56618 2.92901 2.50645 3.48014L2.5 3.6V4H0V1.5C0 0.671573 0.671573 0 1.5 0H12.5C13.3284 0 14 0.671573 14 1.5Z"
        fill={fill}
      />
      <path
        d="M0 10H3.5C3.5 10.5128 3.88604 10.9355 4.38338 10.9933L4.5 11H9.5C10.0128 11 10.4355 10.614 10.4933 10.1166L10.5 10H14V12.5C14 13.3284 13.3284 14 12.5 14H1.5C0.671573 14 0 13.3284 0 12.5V10ZM14 9H10.5V5H14V9ZM0 5H3.5V9H0V5ZM14 1.5V4H10.5C10.5 3.48716 10.114 3.06449 9.61662 3.00673L9.5 3H4.5C3.98716 3 3.56449 3.38604 3.50673 3.88338L3.5 4H0V1.5C0 0.671573 0.671573 0 1.5 0H12.5C13.3284 0 14 0.671573 14 1.5Z"
        fill={fill}
      />
    </svg>
  );
};

OpenstackIcon.propTypes = {
  size: propTypes.number, // pixels
  fill: propTypes.string, // CSS value
};

OpenstackIcon.defaultProps = {
  size: 16,

  // NOTE: this is a valid CSS color value that will reference the nearest `color`
  //  style's value in the cascading chain
  fill: 'currentColor',
};
