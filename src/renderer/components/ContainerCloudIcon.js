import propTypes from 'prop-types';

// this is the current Mirantis Container Cloud icon
export const ContainerCloudIcon = function ({ size, fill, ...svgProps }) {
  return (
    <svg
      {...svgProps}
      viewBox="0 0 32 37"
      width={size}
      height={size}
      style={{ ...svgProps?.style, fill }}
    >
      <g>
        <path d="M15.99 0L0 9.21001V27.63L16 36.84L31.99 27.63V9.21001L15.99 0ZM30.49 26.77L16 35.12L1.5 26.77V10.08L15.99 1.73L30.49 10.08V26.77Z" />
        <path d="M7.70999 20.6L15.11 24.87L15.61 24L6.08 18.5L7.69 17.56L7.73999 17.59L11.46 15.42L7.70999 13.26L3.98999 15.42L6.69 16.98L4.08 18.5L6.70999 20.02L4.08 21.54L15.79 28.3L16.29 27.43L6.08 21.53L7.70999 20.6ZM7.72 14.42L9.47 15.43L7.73999 16.44L6 15.43L7.72 14.42Z" />
        <path d="M20.26 15.16L23.99 13L20.24 10.84L16.52 13.01L20.26 15.16ZM20.24 11.99L21.99 13L20.26 14L18.52 12.99L20.24 11.99Z" />
        <path d="M12.35 15.43L16.1 17.59L19.82 15.43L16.07 13.27L12.35 15.43ZM17.82 15.43L16.09 16.43L14.34 15.42L16.07 14.41L17.82 15.43Z" />
        <path d="M8.19 17.8499L11.93 20.0099L15.65 17.8399L11.91 15.6799L8.19 17.8499ZM13.65 17.8499L11.92 18.8599L10.17 17.8499L11.9 16.8499L13.65 17.8499Z" />
        <path d="M15.63 13L11.88 10.84L8.16 13.01L11.91 15.17L15.63 13ZM10.16 13L11.89 11.99L13.64 13L11.91 14L10.16 13Z" />
        <path d="M16.07 12.7401L19.8 10.58L16.05 8.42004L12.33 10.58L16.07 12.7401ZM16.06 9.58005L17.81 10.59L16.08 11.59L14.34 10.58L16.06 9.58005Z" />
        <path d="M26.37 18.2901C26.22 18.2901 26.06 18.3201 25.89 18.3701C26.04 18.0201 26.12 17.6801 26.12 17.3501C26.12 16.8901 25.98 16.5901 25.7 16.4201C25.58 16.3501 25.46 16.3201 25.32 16.3201V16.3101C25.13 16.3101 24.91 16.3801 24.68 16.5101C24.32 16.7201 24.01 17.0301 23.75 17.4501C23.52 16.9601 23.17 16.6601 22.69 16.5701C22.59 16.5501 22.48 16.5401 22.36 16.5401C21.96 16.5401 21.54 16.6701 21.08 16.9301C20.29 17.3901 19.61 18.1001 19.05 19.0701C18.49 20.0401 18.21 20.9801 18.21 21.8901C18.21 21.9501 18.21 22.0401 18.22 22.1601C17.78 22.6501 17.43 23.2101 17.17 23.8301C16.91 24.4501 16.78 25.0501 16.78 25.6001C16.79 26.4001 17.03 26.9401 17.53 27.2201C17.73 27.3401 17.95 27.4001 18.19 27.4001C18.53 27.4001 18.9 27.2801 19.31 27.0501L25.41 23.5301C26 23.1901 26.51 22.6601 26.93 21.9301C27.35 21.2101 27.56 20.5001 27.56 19.8201C27.56 19.2401 27.4 18.8201 27.09 18.5501C26.88 18.3801 26.64 18.2901 26.37 18.2901Z" />
        <path d="M21.27 15.74C21.55 15.57 21.88 15.47 22.28 15.47C22.52 15.47 22.73 15.51 22.93 15.58C22.96 15.59 23 15.6 23.04 15.61L22.74 15.43L24.47 14.42L26.22 15.43L25.88 15.63C26.23 15.78 26.49 16.03 26.68 16.32L28.22 15.43L24.47 13.27L20.75 15.44L21.27 15.74Z" />
        <path d="M17.34 19.99C17.37 19.89 17.41 19.8 17.45 19.71C17.52 19.49 17.64 19.28 17.78 19.09L16.07 18.11L12.35 20.27L16.09 22.43L17.16 21.81C17.05 21.44 17.04 21.05 17.13 20.67L16.09 21.27L14.34 20.26L16.07 19.26L17.34 19.99Z" />
        <path d="M20.8 15.9899L20.28 15.6899L16.56 17.8499L18.05 18.7099C18.52 17.4799 19.44 16.4499 20.8 15.9899Z" />
      </g>
    </svg>
  );
};

ContainerCloudIcon.propTypes = {
  size: propTypes.number, // pixels
  fill: propTypes.string, // CSS value
};

ContainerCloudIcon.defaultProps = {
  size: 16,

  // NOTE: this is a valid CSS color value that will reference the nearest `color`
  //  style's value in the cascading chain
  fill: 'currentColor',
};
