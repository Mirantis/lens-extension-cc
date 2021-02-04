import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Component } from '@k8slens/extensions';
import { useClusterActions } from './store/ClusterActionsProvider';
import { Cluster } from './store/Cluster';
import { Section } from './Section';
import { layout, mixinFlexColumnGaps } from './styles';
import * as strings from '../strings';

const CheckList = styled.div(function () {
  return {
    ...mixinFlexColumnGaps(layout.pad),

    backgroundColor: 'var(--mainBackground)',
    padding: layout.pad,
    overflow: 'auto',

    borderRadius: layout.grid,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: 'var(--borderColor)',

    boxShadow: '0 0 4px 0 inset var(--boxShadow)',
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
  } = useClusterActions();

  // only ready clusters can actually be selected
  const selectableClusters = clusters.filter((cl) => cl.ready);

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
      onSelectAll({
        selected: selectedClusters.length < selectableClusters.length,
      });
    }
  };

  //
  // RENDER
  //

  const isClusterSelected = function (cluster) {
    return !!selectedClusters.find((c) => c.id === cluster.id);
  };

  // first by namespace, then by name
  const compareClusters = function (left, right) {
    const nsCompare = left.namespace.localeCompare(right.namespace);
    if (nsCompare !== 0) {
      return nsCompare;
    }

    return left.name.localeCompare(right.name);
  };

  return (
    <Section className="lecc-ClusterList">
      <h3>{strings.clusterList.title()}</h3>
      <CheckList>
        {clusters.sort(compareClusters).map((
          cluster // list ALL clusters
        ) => (
          <Component.Checkbox
            key={cluster.id}
            label={`${cluster.namespace} / ${cluster.name}${
              cluster.ready ? '' : ` ${strings.clusterList.notReady()}`
            }`}
            disabled={!cluster.ready || addingClusters}
            value={isClusterSelected(cluster)}
            onChange={(checked) => handleClusterSelect(checked, cluster)}
          />
        ))}
      </CheckList>
      <div>
        <Component.Button
          primary
          disabled={selectableClusters.length <= 0 || addingClusters}
          label={
            selectedClusters.length < selectableClusters.length
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
  clusters: propTypes.arrayOf(propTypes.instanceOf(Cluster)), // ALL clusters, even non-ready ones
  selectedClusters: propTypes.arrayOf(propTypes.instanceOf(Cluster)),
  onSelection: propTypes.func, // ({ cluster: Cluster, selected: boolean }) => void
  onSelectAll: propTypes.func, // ({ selected: boolean }) => void
};

ClusterList.defaultProps = {
  clusters: [],
  selectedClusters: [],
};
