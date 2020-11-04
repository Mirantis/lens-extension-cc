import React from 'react';
import propTypes from 'prop-types';
import { Cluster } from './store/Cluster';

export const ClusterList = function ({ clusters }) {
  return (
    <>
      <p>CLUSTERS:</p>
      <ul>
        {clusters.map((cluster) => (
          <li key={cluster.id}>{`- ${cluster.namespace}/${cluster.name}`}</li>
        ))}
      </ul>
    </>
  );
};

ClusterList.propTypes = {
  clusters: propTypes.arrayOf(propTypes.instanceOf(Cluster)),
};
