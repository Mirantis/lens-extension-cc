import { useState, useEffect } from 'react';
import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { useClusterLoadingState } from '../../hooks/useClusterLoadingState';
import { Cluster } from '../../store/Cluster';
import { Section } from '../Section';
import { InlineNotice, types as noticeTypes, iconSizes } from '../InlineNotice';
import { layout, mixinFlexColumnGaps } from '../styles';
import { getLensClusters } from '../../rendererUtil';
import { IpcRenderer } from '../../IpcRenderer';
import * as strings from '../../../strings';
import { ipcEvents } from '../../../constants';

const { Component } = Renderer;

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
  onlyNamespaces,
  selectedClusters,
  singleSelectOnly,
  onSelection,
  onSelectAll,
}) {
  //
  // STATE
  //

  const loading = useClusterLoadingState();

  // only ready clusters can actually be selected
  const selectableClusters = clusters.filter((cl) => cl.ready);

  const [lensClusters, setLensClusters] = useState(getLensClusters());

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

  const handleIpcClustersChanged = function () {
    setLensClusters(getLensClusters());
  };

  //
  // EFFECTS
  //

  useEffect(function () {
    const disposeClusterAdded = IpcRenderer.getInstance().listen(
      ipcEvents.broadcast.CLUSTERS_ADDED,
      handleIpcClustersChanged
    );
    const disposeClusterRemoved = IpcRenderer.getInstance().listen(
      ipcEvents.broadcast.CLUSTERS_REMOVED,
      handleIpcClustersChanged
    );

    return function () {
      disposeClusterAdded();
      disposeClusterRemoved();
    };
  }, []);

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
      {onlyNamespaces && (
        <p>{strings.clusterList.onlyNamespaces(onlyNamespaces)}</p>
      )}
      {singleSelectOnly && (
        <InlineNotice type={noticeTypes.WARNING} iconSize={iconSizes.SMALL}>
          <small
            dangerouslySetInnerHTML={{
              __html: strings.clusterList.ssoLimitationHtml(),
            }}
          />
        </InlineNotice>
      )}
      <CheckList>
        {clusters.sort(compareClusters).map(
          (
            cluster // list ALL clusters
          ) => {
            const inLens = lensClusters.find(
              (lc) => lc.metadata.uid === cluster.id
            );
            return (
              <Component.Checkbox
                key={cluster.id}
                label={`${cluster.namespace} / ${cluster.name}${
                  cluster.ready
                    ? inLens
                      ? ` ${strings.clusterList.alreadyInLens()}`
                      : ''
                    : ` ${strings.clusterList.notReady()}`
                }`}
                disabled={!cluster.ready || inLens || loading}
                value={isClusterSelected(cluster)}
                onChange={(checked) => handleClusterSelect(checked, cluster)}
              />
            );
          }
        )}
      </CheckList>
      {!singleSelectOnly && (
        <div>
          <Component.Button
            primary
            disabled={loading || selectableClusters.length <= 0}
            label={
              selectedClusters.length < selectableClusters.length
                ? strings.clusterList.action.selectAll.label()
                : strings.clusterList.action.selectNone.label()
            }
            onClick={handleSelectAllNone}
          />
        </div>
      )}
    </Section>
  );
};

ClusterList.propTypes = {
  clusters: propTypes.arrayOf(propTypes.instanceOf(Cluster)), // ALL clusters, even non-ready ones
  onlyNamespaces: propTypes.arrayOf(propTypes.string), // optional list of namespace IDs to which the list is restricted
  selectedClusters: propTypes.arrayOf(propTypes.instanceOf(Cluster)),
  singleSelectOnly: propTypes.bool, // true if only one cluster may be selected; false if any number can be selected
  onSelection: propTypes.func, // ({ cluster: Cluster, selected: boolean }) => void
  onSelectAll: propTypes.func, // ({ selected: boolean }) => void
};

ClusterList.defaultProps = {
  singleSelectOnly: false,
  clusters: [],
  selectedClusters: [],
};
