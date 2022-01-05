import styled from '@emotion/styled';
import { layout } from '../styles';
import { synchronizeBlock } from '../../../strings';

const Content = styled.div(() => ({
  marginTop: layout.gap * 2,
  maxWidth: '750px',
  display: 'flex',
  width: '100%',
}));

const Title = styled.h3(() => ({
  marginBottom: layout.pad,
  alignSelf: 'start',
}));

export const SynchronizeBlock = () => {
  return (
    <Content>
      <Title>{synchronizeBlock.title()}</Title>
    </Content>
  );
};
