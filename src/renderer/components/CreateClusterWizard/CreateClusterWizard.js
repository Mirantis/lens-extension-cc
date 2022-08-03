import { useRef, useState, useCallback } from 'react';
import styled from '@emotion/styled';
import propTypes from 'prop-types';
import { Wizard } from '../Wizard/Wizard';
import { WizardStep } from '../Wizard/WizardStep';
import * as strings from '../../../strings';
import { layout } from '../styles';
import { providerTypes } from '../../../constants';
import { vGap } from './createClusterUtil';
import { GeneralStep } from './GeneralStep';
import { ProviderStep } from './ProviderStep';
import { ClusterStep } from './ClusterStep';
import { MonitorStep } from './MonitorStep';
import { NodeStep } from './NodeStep';

const StyledWizard = styled(Wizard)(() => ({
  // generally, inputs have a label above them, and each label+input is separated by
  //  the same vertical gap
  label: {
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginTop: vGap,
    marginBottom: layout.grid * 2,

    '&:first-of-type': {
      marginTop: 0,
    },

    input: {
      textTransform: 'none',
    },
  },

  // Lens Select (based on react-select) has 1px border but seems to use content-box
  //  instead of border-box, so we have to compensate with left/right padding to be
  //  sure we see the border on all sides
  '.Select': {
    padding: '0 1px 0 1px',
  },
}));

export const CreateClusterWizard = function ({ onCancel, onComplete }) {
  //
  // STATE
  //

  const data = useRef({}); // data collected in each step
  const [providerStepTitle, setProviderStepTitle] = useState(
    strings.createClusterWizard.steps.provider.equinix.stepTitle()
  );

  //
  // EVENTS
  //

  const handleWizardComplete = useCallback(
    function () {
      if (typeof onComplete === 'function') {
        onComplete({ data: data.current });
      }
    },
    [onComplete]
  );

  const handleNext = useCallback(function () {
    const providerType = data.general?.providerType; // may not be set yet

    switch (providerType) {
      case providerTypes.EQUINIX:
        setProviderStepTitle(
          strings.createClusterWizard.steps.provider.equinix.stepTitle()
        );
        break;
      default:
        break; // leave as-is
    }
  }, []);

  //
  // EFFECTS
  //

  //
  // RENDER
  //

  return (
    <StyledWizard
      title={strings.createClusterWizard.title()}
      lastLabel={strings.createClusterWizard.lastLabel()}
      onNext={handleNext}
      onComplete={handleWizardComplete}
      onCancel={onCancel}
    >
      <WizardStep
        id="general"
        title={strings.createClusterWizard.steps.general.stepTitle()}
      >
        {({ step }) => <GeneralStep step={step} data={data.current} />}
      </WizardStep>
      <WizardStep
        id="provider"
        title={providerStepTitle}
        label={strings.createClusterWizard.steps.provider.stepLabel()}
      >
        {({ step }) => <ProviderStep step={step} data={data.current} />}
      </WizardStep>
      <WizardStep
        id="cluster"
        title={strings.createClusterWizard.steps.cluster.stepTitle()}
      >
        {({ step }) => <ClusterStep step={step} data={data.current} />}
      </WizardStep>
      <WizardStep
        id="monitor"
        title={strings.createClusterWizard.steps.monitor.stepTitle()}
        label={strings.createClusterWizard.steps.monitor.stepLabel()}
      >
        {({ step }) => <MonitorStep step={step} data={data.current} />}
      </WizardStep>
      <WizardStep
        id="node"
        title={strings.createClusterWizard.steps.node.stepTitle()}
        label={strings.createClusterWizard.steps.node.stepLabel()}
      >
        {({ step }) => <NodeStep step={step} data={data.current} />}
      </WizardStep>
    </StyledWizard>
  );
};

CreateClusterWizard.propTypes = {
  /**
   * Called if the Wizard is canceled.
   *
   * Signature: `() => void`
   */
  onCancel: propTypes.func,

  /**
   * Called when the user exits the Wizard after completing all steps.
   *
   * Signature: `(info: { data }) => void`
   *
   * - `info.data`: All data accumulated in the wizard.
   */
  onComplete: propTypes.func,
};
