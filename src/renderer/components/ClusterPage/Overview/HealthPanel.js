import propTypes from 'prop-types';

export const HealthPanel = ({ clusterEntity }) => {
  return <div>HEALTH of {clusterEntity.metadata.name}</div>;
};

HealthPanel.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
