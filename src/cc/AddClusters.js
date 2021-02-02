//
// Add Clusters Panel
//

import { useState } from 'react';
import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Component } from '@k8slens/extensions';
import { Cluster } from './store/Cluster';
import { useClusterActions } from './store/ClusterActionsProvider';
import { useExtState } from './store/ExtStateProvider';
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

export const AddClusters = function ({ onAdd, clusters, passwordRequired }) {
  //
  // STATE
  //

  const {
    state: { authAccess },
  } = useExtState();

  const {
    state: { loading: addClustersLoading },
    actions: clusterActions,
  } = useClusterActions();

  const [password, setPassword] = useState('');

  //
  // EVENTS
  //

  const handlePasswordChange = function (value) {
    setPassword(value);
  };

  const handleAddClick = function () {
    if (typeof onAdd === 'function') {
      onAdd({ password: passwordRequired ? password : null });
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

      {/* required when responding to an EXT_EVENT_ADD_CLUSTERS where we get tokens without a password */}
      {passwordRequired && (
        <>
          <Component.Input
            style={{ width: 200 }}
            type="password"
            theme="round-black" // borders on all sides, rounded corners
            disabled={addClustersLoading}
            value={password}
            onChange={handlePasswordChange}
          />
          <small className="hint">
            {strings.addClusters.password.tip(authAccess.username)}
          </small>
        </>
      )}

      <div>
        <Component.Button
          primary
          disabled={
            clusters.length <= 0 ||
            addClustersLoading ||
            (passwordRequired && !password)
          }
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
  passwordRequired: propTypes.bool,

  // ({ password: string|null }) => void
  // `password` is null if `passwordRequired` was `false` and therefore a value was not collected
  //  from the user
  onAdd: propTypes.func,
};

AddClusters.defaultProps = {
  clusters: [],
  passwordRequired: false,
};
