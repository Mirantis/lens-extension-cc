import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { themeModes } from '../theme';

const {
  Component: { DrawerTitle },
} = Renderer;

const Title = styled(DrawerTitle)(({ theme }) => ({
  backgroundColor:
    theme.mode === themeModes.LIGHT
      ? 'var(--sidebarBackground)'
      : 'var(--drawerSubtitleBackground)',
}));

export const PanelTitle = ({ title }) => {
  return <Title>{title}</Title>;
};

PanelTitle.propTypes = {
  title: propTypes.string.isRequired,
};
