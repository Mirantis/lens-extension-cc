import styled from '@emotion/styled';
import { layout } from '../styles';
import ConnectionBlock from './ConnectionBlock';


const PageContainer = styled.div(function () {
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--contentColor)',
    display: 'flex',
    justifyContent: 'space-between',
  };
});
const EscColumn = styled.div(function () {
  return {
    marginTop: layout.gap,
    padding: layout.gap,
    width: '50px',
    flexShrink: 1,
  };
});

const MainColumn = styled.div(function () {
  return {
    display: 'flex',
    flex: 1,
    justifyContent: 'center',
  };
});

const AddCloudInstance = () => {
  return (
    <PageContainer>
      <MainColumn>
        <ConnectionBlock />
      </MainColumn>
      <EscColumn>Esc</EscColumn>
    </PageContainer>
  );
};

export default AddCloudInstance;
