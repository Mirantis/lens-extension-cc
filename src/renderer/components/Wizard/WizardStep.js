//
// Step in a Wizard
//

import { useMemo } from 'react';
import propTypes from 'prop-types';
import styled from '@emotion/styled';
import * as rtv from 'rtvjs';
import { layout } from '../styles';

//
// Styled Parts
//

const Header = styled.div(() => ({
  flex: 'none', // flex child of Step
  marginBottom: layout.grid * 7,
}));

const Content = styled.div(() => ({
  flex: '1 1 auto', // flex child of Step
  overflowX: 'hidden',
  overflowY: 'auto',
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

const Step = styled.div(() => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

//
// Component
//

export const WizardStep = function (props) {
  //
  // PROPS
  //

  const { title } = props;

  /* istanbul ignore else -- we don't run tests with the flag disabled */
  if (DEV_ENV) {
    // PERFORMANCE: only verify props when they change
    // eslint-disable-next-line react-hooks/rules-of-hooks -- DEV_ENV never changes at runtime
    useMemo(
      function () {
        rtv.verify(
          {
            props: { id: props.id, title },
          },
          {
            props: {
              id: rtv.STRING,
              title: rtv.STRING,
            },
          }
        );
      },
      [title, props.id]
    );
  }

  //
  // STATE
  //

  //
  // EVENTS
  //

  //
  // EFFECTS
  //

  //
  // RENDER
  //

  const { className, children } = props;

  return (
    <Step className={className}>
      <Header>
        <h2>{title}</h2>
      </Header>
      <Content>{children({ step: props })}</Content>
    </Step>
  );
};

WizardStep.propTypes = {
  /**
   * Custom step content to render as a render child.
   *
   * The child is expected to call the `onChange` event prop when its valid state changes.
   *
   * Signature: `(params: { step }) => React.Element`
   *
   * `step`: All props given to this step (original and those set by the Wizard).
   */
  children: propTypes.func.isRequired,

  /**
   * Class name for the Step.
   */
  className: propTypes.string,

  /**
   * Unique ID for this step in the Wizard. Used by the Wizard to track internal state.
   */
  id: propTypes.string.isRequired,

  /**
   * Step label used in the Wizard's step list. Defaults to the `title` if not set or empty.
   */
  label: propTypes.string,

  /**
   * Index of this step in the Wizard. Set (i.e. overridden) by the Wizard.
   */
  stepIndex: propTypes.number,

  /**
   * Step title. Appears above step content.
   *
   * NOTE: If the `label` prop isn't specified, the title is also used as the step's
   *  label in the Wizard's step list.
   */
  title: propTypes.string.isRequired,

  //// EVENTS

  /**
   * Called when this step's validity has changed.
   *
   * NOTE: This prop will be set by the Wizard for its handling purposes. The Step is expected
   *  to call it when its validated state changes or when it needs to control the Next button.
   *
   * Signature: `(info: { stepIndex: number, validated?: boolean, nextEnabled?: boolean }) => void`
   *
   * - `info.stepIndex`: (__Required__) Value of the step's `stepIndex` prop.
   * - `info.validated`: (Optional) True if the step has been validated and navigation can move
   *    forward past this step; false if not. Note that if the Wizard allows moving
   *    next from this step, this step is implicitly considered validated. Use this primarily
   *    to _invalidate_ this step if its state changes such that it needs re-validating on next.
   *    - By default, the Wizard assumes all steps are validated. If a step doesn't have async
   *        validation on Next, it's best to use `nextEnabled` to control the immediate state
   *        of the Next button for client-side validations.
   *    - NOTE: A step should not store its own validated state and use it to control this flag.
   *        Only set this flag to false if something changes causing the step's data to need to
   *        be revalidated on Next.
   *    - NOTE: An invalid step means __all__ following steps become inaccessible even if already
   *        visited.
   * - `info.nextEnabled`: (Optional) True if the Next button is enabled; false if not.
   */
  onChange: propTypes.func,
};
