import styled from '@emotion/styled';
import { layout } from '../styles';

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

const SynchronizeBlock = () => {
  return (
    <Content>
      <Title>Select projects to synchronize</Title>
    </Content>
  );
};

export default SynchronizeBlock;
