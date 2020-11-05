import React from 'react';
import propTypes from 'prop-types';
import { Cluster } from './store/Cluster';

export const ClusterList = function ({ clusters }) {
  return (
    <div className="ClusterList">
      <p>CLUSTERS:</p>
      <ul>
        {clusters
          .filter((cluster) => !cluster.isManagementCluster)
          .map((cluster) => (
            <li key={cluster.id}>{`- ${cluster.namespace}/${cluster.name}`}</li>
          ))}
      </ul>
    </div>
  );
};

ClusterList.propTypes = {
  clusters: propTypes.arrayOf(propTypes.instanceOf(Cluster)),
};
