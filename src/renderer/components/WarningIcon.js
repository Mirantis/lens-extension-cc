import propTypes from 'prop-types';

export const WarningIcon = function ({ size, fill, ...svgProps }) {
  return (
    <svg {...svgProps} width={size} height={size} viewBox="0 0 64 64">
      <path
        d="M56 58.6666H7.99998C7.07465 58.6666 6.21865 58.1866 5.73065 57.4026C5.24265 56.6133 5.20265 55.6346 5.61331 54.8053L29.6133 6.80529C30.5173 4.99996 33.48 4.99996 34.384 6.80529L58.384 54.8053C58.7946 55.6346 58.7547 56.6106 58.2666 57.4026C57.7813 58.1893 56.9253 58.6666 56 58.6666ZM12.3146 53.3333H51.6853L32 13.9653L12.3146 53.3333Z"
        fill={fill}
      />
      <path d="M34.6666 26.6666H29.3333V42.6666H34.6666V26.6666Z" fill={fill} />
      <path
        d="M32 51.3333C33.8409 51.3333 35.3333 49.8409 35.3333 48C35.3333 46.159 33.8409 44.6666 32 44.6666C30.159 44.6666 28.6666 46.159 28.6666 48C28.6666 49.8409 30.159 51.3333 32 51.3333Z"
        fill={fill}
      />
    </svg>
  );
};

WarningIcon.propTypes = {
  size: propTypes.number, // pixels
  fill: propTypes.string, // CSS value
};

WarningIcon.defaultProps = {
  size: 16,
  fill: 'currentColor',
};
