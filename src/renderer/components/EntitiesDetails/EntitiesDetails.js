import PropTypes from 'prop-types';
import { MccCredentialEntity } from './MccCredentialEntity';

const ENTITY_KIND = {
  MCC_CREDENTIAL: 'MccCredential',
};

export const EntitiesDetails = ({ info }) => {
  const { kind } = info.entity;

  return (
    kind === ENTITY_KIND.MCC_CREDENTIAL && (
      <MccCredentialEntity data={info.entity.spec} />
    )
  );
};

EntitiesDetails.propTypes = {
  info: PropTypes.object.isRequired,
  kind: PropTypes.string.isRequired,
};
