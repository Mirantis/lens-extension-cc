import { useEffect } from 'react';
import propTypes from 'prop-types';
import { WizardStep } from '../Wizard/WizardStep';

/**
 * Determines if the Next button should be enabled for this step.
 * @param {Object} data Wizard data object.
 * @returns {boolean} True to enable; false to disable.
 */
const getNextEnabled = function (data) {
  const { cluster } = data;

  return !!cluster; // TODO
};

// eslint-disable-next-line react/prop-types -- doesn't support prop type spread we're using
export const ClusterStep = function ({ step: { onChange, stepIndex }, data }) {
  //
  // STATE
  //

  if (!data.cluster) {
    // initialize step data
    data.cluster = {
      // TODO
    };
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
