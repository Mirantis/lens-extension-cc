import propTypes from 'prop-types';
import { WizardStep } from '../Wizard/WizardStep';
import { providerTypes } from '../../../constants';
import { EquinixProvider } from './EquinixProvider';

// eslint-disable-next-line react/prop-types -- doesn't support prop type spread we're using
export const ProviderStep = function (props) {
  const {
    data: {
      general: { providerType },
    },
  } = props;

  switch (providerType) {
    case providerTypes.EQUINIX:
      return <EquinixProvider {...props} />;
    default:
      throw new Error(`Unsupported provider type "${providerType}"`);
  }
};

ProviderStep.propTypes = {
  step: propTypes.shape({ ...WizardStep.props }).isRequired,
  data: propTypes.object.isRequired,
};
