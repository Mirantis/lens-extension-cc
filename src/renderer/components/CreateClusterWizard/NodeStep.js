import { useEffect } from 'react';
import propTypes from 'prop-types';
import { WizardStep } from '../Wizard/WizardStep';

/**
 * Determines if the Next button should be enabled for this step.
 * @param {Object} data Wizard data object.
 * @returns {boolean} True to enable; false to disable.
 */
const getNextEnabled = function (data) {
  const { node } = data;

  return !!node; // TODO
};

// eslint-disable-next-line react/prop-types -- doesn't support prop type spread we're using
export const NodeStep = function ({ step: { onChange, stepIndex }, data }) {
  //
  // STATE
  //

  if (!data.node) {
    // initialize step data
    data.node = {
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

  return <p>TODO: Node settings...</p>;
};

NodeStep.propTypes = {
  step: propTypes.shape({ ...WizardStep.props }).isRequired,
  data: propTypes.object.isRequired,
};
