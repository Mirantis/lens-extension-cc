import PropTypes from 'prop-types';
import { Renderer } from '@k8slens/extensions';

const {
  Component: { DrawerTitle, DrawerItem },
} = Renderer;

export const MccCredentialEntity = ({ data }) => {
  const { provider, region, status, created } = data;

  return (
    <>
      <DrawerTitle title="Additional information" />
      <DrawerItem name="Provider">{provider}</DrawerItem>
      <DrawerItem name="Region">{region}</DrawerItem>
      <DrawerItem name="MCC Status">{status}</DrawerItem>
      <DrawerItem name="Date created">{created}</DrawerItem>
    </>
  );
};

MccCredentialEntity.propTypes = {
  data: PropTypes.object.isRequired,
  provider: PropTypes.string,
  region: PropTypes.string,
  status: PropTypes.string,
  created: PropTypes.string,
};

MccCredentialEntity.defaultProps = {
  provider: '',
  region: '',
  status: '',
  created: '',
};
