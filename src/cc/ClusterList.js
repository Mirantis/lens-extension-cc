import React from 'react';
import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Cluster } from './store/Cluster';
import * as strings from '../strings';

const Section = styled.section(function () {
  // DEBUG TODO any styles needed?
});

export const ClusterList = function ({ clusters }) {
  return (
    <Section className="lecc-ClusterList">
      <h2>{strings.clusterList.title()}</h2>
      <ul>
        {clusters.map((cluster) => (
          <li key={cluster.id}>{`- ${cluster.namespace}/${cluster.name}`}</li>
        ))}
      </ul>
    </Section>
  );
};

ClusterList.propTypes = {
  clusters: propTypes.arrayOf(propTypes.instanceOf(Cluster)),
  selectedClusters: propTypes.arrayOf(propTypes.instanceOf(Cluster)),
  onSelection: propTypes.func, // ({ cluster: Cluster, selected: boolean }) => void
  onSelectAll: propTypes.func, // ({ selected: boolean }) => void
};

ClusterList.defaultProps = {
  clusters: [],
  selectedClusters: [],
};
