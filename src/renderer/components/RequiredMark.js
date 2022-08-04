import styled from '@emotion/styled';
import { layout } from './styles';

export const RequiredMark = styled.span(() => ({
  color: 'var(--colorError)',
  marginLeft: layout.grid,

  '&::before': {
    content: '"*"',
  },
}));
