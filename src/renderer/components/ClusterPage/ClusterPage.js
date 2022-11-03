import propTypes from 'prop-types';
import { ThemeProvider } from '@emotion/react';
import { useThemeSwitching } from '../useThemeSwitching';

export const ClusterPage = ({ children }) => {
  const { theme } = useThemeSwitching();

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};

ClusterPage.propTypes = {
  children: propTypes.node.isRequired,
};
