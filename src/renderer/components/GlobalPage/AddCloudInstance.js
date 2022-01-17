import styled from '@emotion/styled';
import { useState } from 'react';
import PropTypes from 'prop-types';
import { layout } from '../styles';
import { ConnectionBlock } from './ConnectionBlock';
import { SynchronizeBlock } from './SynchronizeBlock';
import { CloseButton } from '../CloseButton/CloseButton';
import { ExtendedCloud } from '../../../common/ExtendedCloud';

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
    margin: layout.gap,
    width: '50px',
    flexShrink: 1,
  };
});

const MainColumn = styled.div(function () {
  return {
    display: 'flex',
    flex: 1,
    justifyContent: 'start',
    flexDirection: 'column',
    alignItems: 'center',
  };
});

export const AddCloudInstance = ({ onCancel }) => {
  const [cloud, setCloud] = useState(null)
  const [extCloud, setExtCloud] = useState(null)

  const [loading, setLoading] = useState(false)

  const makeExtCloud = async () => {
    setLoading(true)
    const extCl = new ExtendedCloud(cloud)
    try {
      const result = await extCl.init(true)
      setExtCloud(result)
      setLoading(false)
    } catch (err) {
      setLoading(false)
      console.log(err)
    }
  }
  if(cloud && !loading && !extCloud){
    // loadCloudData(cloud).then(console.log)
    makeExtCloud()
  }
  if(extCloud) {
    console.log('extCloud', extCloud)
  }
  return (
    <PageContainer>
      <MainColumn>
        <ConnectionBlock setCloud={setCloud} extCloudloading={loading}/>
        <SynchronizeBlock cloud={cloud}/>
      </MainColumn>
      <EscColumn>
        <CloseButton onClick={onCancel} />
      </EscColumn>
    </PageContainer>
  );
};

AddCloudInstance.propTypes = {
  onCancel: PropTypes.func.isRequired,
};
