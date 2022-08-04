import { useCallback, useState, useEffect } from 'react';
import propTypes from 'prop-types';
import { Renderer } from '@k8slens/extensions';
import * as rtv from 'rtvjs';
import { WizardStep } from '../Wizard/WizardStep';
import * as strings from '../../../strings';
import { RequiredMark } from '../RequiredMark';

const {
  Component: { Input, Select },
} = Renderer;

/**
 * Determines if the Next button should be enabled for this step.
 * @param {Object} data Wizard data object.
 * @returns {boolean} True to enable; false to disable.
 */
const getNextEnabled = function (data) {
  const { provider } = data;

  return !!(provider.facility && provider.vlanId);
};

// describes this step's expected data structure
export const equinixProviderTs = {
  vlanId: [rtv.EXPECTED, rtv.STRING],
  facility: [rtv.EXPECTED, rtv.STRING],
};

export const EquinixProvider = function ({
  // eslint-disable-next-line react/prop-types -- doesn't support prop type spread we're using
  step: { onChange, stepIndex },
  data,
}) {
  //
  // STATE
  //

  if (!data.provider) {
    // initialize step data
    data.provider = { vlanId: null, facility: null };
  } else {
    // NOTE: `exactShapes` helps ensure that we know when we've added a new property
    //  in the code somewhere but didn't add it to the step's RTV typeset
    DEV_ENV &&
      rtv.verify(data.provider, equinixProviderTs, { exactShapes: true });
  }

  const [facility, setFacility] = useState(data.provider.facility);
  const [vlanId, setVlanId] = useState(data.provider.vlanId || '');

  //
  // EVENTS
  //

  const handleFacilityChange = useCallback(
    function (newSelection) {
      const newValue = newSelection?.value || null;
      setFacility(newValue);
      data.provider = { ...data.provider, facility: newValue };
      onChange?.({ nextEnabled: getNextEnabled(data), stepIndex });
    },
    [data, onChange, stepIndex]
  );

  const handleVlandIdChange = useCallback(
    function (newValue, event) {
      setVlanId(newValue);
      data.provider = { ...data.provider, vlanId: newValue };
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

  // TODO: may need to get these from the API, or are they known?
  const facilityOptions = [
    { value: 'facility1', label: 'Facility 1' },
    { value: 'facility2', label: 'Facility 2' },
  ];

  return (
    <>
      <label htmlFor="wiz-create-cluster--provider--equinix--facility">
        {strings.createClusterWizard.steps.provider.equinix.fields.facilityLabel()}
        <RequiredMark />
      </label>
      <Select
        required
        isClearable
        options={facilityOptions}
        value={facility}
        onChange={handleFacilityChange}
      />
      <label htmlFor="wiz-create-cluster--provider--equinix--vlanId">
        {strings.createClusterWizard.steps.provider.equinix.fields.vlanIdLabel()}
        <RequiredMark />
      </label>
      <Input
        type="text"
        theme="round-black" // borders on all sides, rounded corners
        value={vlanId}
        required
        trim
        onChange={handleVlandIdChange}
      />
    </>
  );
};

EquinixProvider.propTypes = {
  step: propTypes.shape({ ...WizardStep.props }).isRequired,
  data: propTypes.object.isRequired,
};
