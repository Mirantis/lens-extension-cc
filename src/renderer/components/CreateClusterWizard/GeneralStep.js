import { useCallback, useState, useEffect } from 'react';
import propTypes from 'prop-types';
import { Renderer } from '@k8slens/extensions';
import * as rtv from 'rtvjs';
import { WizardStep } from '../Wizard/WizardStep';
import { RequiredMark } from '../RequiredMark';
import { providerTypes } from '../../../constants';
import * as strings from '../../../strings';

const {
  Component: { Input },
} = Renderer;

/**
 * Determines if the Next button should be enabled for this step.
 * @param {Object} data Wizard data object.
 * @returns {boolean} True to enable; false to disable.
 */
const getNextEnabled = function (data) {
  const { general } = data;

  return !!(general.clusterName && general.providerType);
};

// describes this step's expected data structure
export const generalStepTs = {
  clusterName: [rtv.EXPECTED, rtv.STRING],
  providerType: [
    rtv.EXPECTED,
    rtv.STRING,
    { oneOf: Object.values(providerTypes) },
  ],
};

// eslint-disable-next-line react/prop-types -- doesn't support prop type spread we're using
export const GeneralStep = function ({ step: { onChange, stepIndex }, data }) {
  //
  // STATE
  //

  if (!data.general) {
    // initialize step data
    data.general = {
      clusterName: null,
      providerType: providerTypes.EQUINIX, // default to most popular
    };
  } else {
    // NOTE: `exactShapes` helps ensure that we know when we've added a new property
    //  in the code somewhere but didn't add it to the step's RTV typeset
    DEV_ENV && rtv.verify(data.general, generalStepTs, { exactShapes: true });
  }

  const [clusterName, setClusterName] = useState(
    data.general.clusterName || ''
  );

  //
  // EVENTS
  //

  const handleClusterNameChange = useCallback(
    function (newValue, event) {
      setClusterName(newValue);
      data.general = { ...data.general, clusterName: newValue };
      onChange?.({ nextEnabled: getNextEnabled(data), stepIndex });
    },
    [data, onChange, stepIndex]
  );

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

  return (
    <>
      <label htmlFor="wiz-create-cluster--general--cluster-name">
        {strings.createClusterWizard.steps.general.fields.clusterNameLabel()}
        <RequiredMark />
      </label>
      <Input
        type="text"
        theme="round-black" // borders on all sides, rounded corners
        value={clusterName}
        required
        trim
        onChange={handleClusterNameChange}
      />
      <h2>{strings.createClusterWizard.steps.general.chooseProvider()}</h2>
      <p>
        TODO: Provider tiles with selection based on
        data.general.providerType...
      </p>
      <h2>
        {strings.createClusterWizard.steps.general.providerRequirements()}
      </h2>
      <p>TODO: Checklist...</p>
    </>
  );
};

GeneralStep.propTypes = {
  step: propTypes.shape({ ...WizardStep.props }).isRequired,
  data: propTypes.object.isRequired,
};
