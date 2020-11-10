import React from 'react';
import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Component } from '@k8slens/extensions';
import { useAddClusters } from './store/AddClustersProvider';
import { Cluster } from './store/Cluster';
import { layout } from './theme';
import * as strings from '../strings';

const Section = styled.section(function () {
  return {
    '--flex-gap': `${layout.gap}px`,
  };
});

const CheckList = styled.div(function () {
  return {
    '--flex-gap': `${layout.pad}px`,

    backgroundColor: 'var(--mainBackground)',
    padding: layout.pad,
    overflow: 'auto',

    borderRadius: layout.grid,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: 'var(--borderColor)',
  };
});

export const ClusterList = function ({
  clusters,
  selectedClusters,
  onSelection,
  onSelectAll,
}) {
  //
  // STATE
  //

  const {
    state: { loading: addingClusters },
  } = useAddClusters();

  //
  // EVENTS
  //

  const handleClusterSelect = function (selected, cluster) {
    if (typeof onSelection === 'function') {
      onSelection({ cluster, selected });
    }
  };

  const handleSelectAllNone = function () {
    if (typeof onSelectAll === 'function') {
      onSelectAll({ selected: selectedClusters.length < clusters.length });
    }
  };

  //
  // RENDER
  //

  const isClusterSelected = function (cluster) {
    return !!selectedClusters.find((c) => c.id === cluster.id);
  };

  const compareClusters = function (left, right) {
    const nsCompare = left.namespace.localeCompare(right.namespace);
    if (nsCompare !== 0) {
      return nsCompare;
    }

    return left.name.localeCompare(right.name);
  };

  return (
    <Section className="lecc-ClusterList flex column gaps">
      <h3>{strings.clusterList.title()}</h3>
      <CheckList className="flex column gaps">
        {clusters.sort(compareClusters).map((cluster) => (
          <Component.Checkbox
            key={cluster.id}
            label={`${cluster.namespace} / ${cluster.name}`}
            disabled={addingClusters}
            value={isClusterSelected(cluster)}
            onChange={(checked) => handleClusterSelect(checked, cluster)}
          />
        ))}
      </CheckList>
      <div>
        <Component.Button
          primary
          disabled={clusters.length <= 0 || addingClusters}
          label={
            selectedClusters.length < clusters.length
              ? strings.clusterList.action.selectAll.label()
              : strings.clusterList.action.selectNone.label()
          }
          onClick={handleSelectAllNone}
        />
      </div>
    </Section>
  );
};

ClusterList.propTypes = {
  clusters: propTypes.array, // DEBUG propTypes.arrayOf(propTypes.instanceOf(Cluster)),
  selectedClusters: propTypes.arrayOf(propTypes.instanceOf(Cluster)),
  onSelection: propTypes.func, // ({ cluster: Cluster, selected: boolean }) => void
  onSelectAll: propTypes.func, // ({ selected: boolean }) => void
};

ClusterList.defaultProps = {
  clusters: [
    // DEBUG REMOVE
    {
      id: '0',
      namespace: 'foo',
      name: 'cluster-0',
    },
    {
      id: '1',
      namespace: 'foo',
      name: 'cluster-1',
    },
    {
      id: '2',
      namespace: 'foo',
      name: 'cluster-2',
    },
    {
      id: '3',
      namespace: 'foo',
      name: 'cluster-3',
    },
    {
      id: '4',
      namespace: 'foo',
      name: 'cluster-4',
    },
    {
      id: '5',
      namespace: 'bar',
      name: 'cluster-5',
    },
    {
      id: '6',
      namespace: 'bar',
      name: 'cluster-6',
    },
    {
      id: '7',
      namespace: 'bar',
      name: 'cluster-7',
    },
    {
      id: '8',
      namespace: 'bar',
      name: 'cluster-8',
    },
    {
      id: '9',
      namespace: 'bar',
      name: 'cluster-9',
    },
  ],
  selectedClusters: [],
};
