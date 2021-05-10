//
// Add Clusters Panel
//

import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Component } from '@k8slens/extensions';
import { Cluster } from './store/Cluster';
import { useClusterActions } from './store/ClusterActionsProvider';
import { Section as BaseSection } from './Section';
import { layout } from './styles';
import { InlineNotice } from './InlineNotice';
import * as strings from '../strings';

const Section = styled(BaseSection)(function () {
  return {
    small: {
      marginTop: -(layout.gap - layout.grid),
    },
  };
});

export const AddClusters = function ({ onAdd, clusters }) {
  //
  // STATE
  //

  const {
    state: { loading: addClustersLoading },
    actions: clusterActions,
  } = useClusterActions();

  //
  // EVENTS
  //

  const handleAddClick = function () {
    if (typeof onAdd === 'function') {
      onAdd();
    }
  };

  const handleSsoCancelClick = function () {
    clusterActions.ssoCancelAddClusters();
  };

  //
  // RENDER
  //

  return (
    <Section className="lecc-AddClusters">
      <h3>{strings.addClusters.title()}</h3>
      <div>
        <Component.Button
          primary
          disabled={clusters.length <= 0 || addClustersLoading}
          label={strings.addClusters.action.label()}
          waiting={addClustersLoading}
          tooltip={
            clusters.length <= 0
              ? strings.addClusters.action.disabledTip()
              : undefined
          }
          onClick={handleAddClick}
        />
      </div>
      {addClustersLoading && (
        <>
          <InlineNotice>
            <p
              dangerouslySetInnerHTML={{
                __html: strings.addClusters.sso.messageHtml(),
              }}
            />
          </InlineNotice>
          <div>
            <Component.Button
              primary
              label={strings.addClusters.action.ssoCancel()}
              onClick={handleSsoCancelClick}
            />
          </div>
        </>
      )}
    </Section>
  );
};

AddClusters.propTypes = {
  clusters: propTypes.arrayOf(propTypes.instanceOf(Cluster)),
  onAdd: propTypes.func, // signature: () => void
};

AddClusters.defaultProps = {
  clusters: [],
};
