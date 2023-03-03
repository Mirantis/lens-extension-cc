import { useEffect } from 'react';
import propTypes from 'prop-types';
import * as rtv from 'rtvjs';
import { WizardStep } from '../Wizard/WizardStep';

/**
 * Determines if the Next button should be enabled for this step.
 * @param {Object} data Wizard data object.
 * @returns {boolean} True to enable; false to disable.
 */
const getNextEnabled = function (data) {
  const { cluster } = data;

  return !!cluster; // TODO[create-cluster]
};

// describes this step's expected data structure
export const clusterStepTs = {};

// eslint-disable-next-line react/prop-types -- doesn't support prop type spread we're using
export const ClusterStep = function ({ step: { onChange, stepIndex }, data }) {
  //
  // STATE
  //

  if (!data.cluster) {
    // initialize step data
    data.cluster = {
      // TODO[create-cluster]
    };
  } else {
    // NOTE: `exactShapes` helps ensure that we know when we've added a new property
    //  in the code somewhere but didn't add it to the step's RTV typeset
    DEV_ENV && rtv.verify(data.cluster, clusterStepTs, { exactShapes: true });
  }

  //
  // EVENTS
  //

  //
  // EFFECTS
  //

  useEffect(
    function () {
      onChange?.({
        nextEnabled: getNextEnabled(data),
        stepIndex,
      });
    },
    [data, stepIndex, onChange]
  );

  //
  // RENDER
  //

  return <p>TODO: Cluster settings...</p>;
};

ClusterStep.propTypes = {
  step: propTypes.shape({ ...WizardStep.props }).isRequired,
  data: propTypes.object.isRequired,
};
