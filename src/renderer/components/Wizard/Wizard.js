//
// Custom Wizard component
//
// NOTE: Lens provides a Wizard in
//  https://github.com/lensapp/lens/tree/master/packages/core/src/renderer/components/wizard
//  but it doesn't work well, isn't documented, and renders steps horizontally, while
//  this Wizard renders steps vertically.
//

import {
  useState,
  useRef,
  useMemo,
  useCallback,
  Children,
  cloneElement,
} from 'react';
import { Renderer } from '@k8slens/extensions';
import propTypes from 'prop-types';
import styled from '@emotion/styled';
import * as rtv from 'rtvjs';
import { layout } from '../styles';
import { CloseButton } from '../CloseButton/CloseButton';
import * as strings from '../../../strings';

const {
  Component: { Button, Notifications },
} = Renderer;

//
// Styled Parts
//

const sectionPad = layout.pad * 3;
const sectionPadding = {
  paddingTop: layout.gap * 4,
  paddingRight: sectionPad / 2,
  paddingBottom: sectionPad,
  paddingLeft: sectionPad / 2,
};
const leftRightSectionWidth = '15vw';
const contentBkColor = 'var(--settingsBackground)';
const overlayBkColor = 'var(--secondaryBackground)'; // also for left section with step list

const RightSection = styled.div(() => ({
  flex: '1 0 auto', // flex child of Overlay, grows only, slower than LeftSection
  ...sectionPadding,
  minWidth: 100,
  width: leftRightSectionWidth,
  height: '100%',
  display: 'flex',
  backgroundColor: contentBkColor,
}));

const Footer = styled.div(() => ({
  flex: 'none', // flex child of MainContent
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: layout.grid * 7,
}));

const StepContainer = styled.div(() => ({
  flex: '0 1 auto', // flex child of MainContent: can shrink

  // NOTE: no height so that it just fits the content and Footer is tucked up underneath
  //  it as opposed to always being pushed to the very bottom of the Overlay
  width: '100%',
}));

const BackPlaceholder = styled.div(() => ({
  width: 1,
  height: 1,
}));

const Header = styled.div(() => ({
  flex: 'none', // flex child of MainContent
  marginBottom: layout.grid * 7,
}));

const MainSection = styled.div(() => ({
  flex: '1 1 auto', // flex child of Overlay, variable width
  ...sectionPadding,
  paddingLeft: sectionPad, // required for active step bar effect and proper visual left pad from LeftSection
  minWidth: layout.grid * 162, // 648px
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: contentBkColor,
}));

const StepListItemLabel = styled.p(() => ({
  flex: '1 1 auto', // flex child of StepListItem: variable width
  margin: 0,
  padding: 0,
  width: 'min-content',
}));

const StepListItemNumber = styled.p(() => ({
  flex: 'none', // flex child of StepListItem: fixed
  margin: 0,
  paddingTop: 0,
  paddingRight: '0.25em', // depend on font size for space between '.' and label
  paddingBottom: 0,
  paddingLeft: layout.grid,
  width: '2em', // approx 2 numbers wide plus '.'
  textAlign: 'right',

  '&::after': {
    content: '"."',
  },
}));

const StepListItem = styled.div(({ isActive, isVisited, isEnabled }) => ({
  flex: '0 1 auto', // flex child of StepList: full width
  backgroundColor: isActive ? contentBkColor : undefined,
  display: 'flex',
  alignItems: 'baseline',
  paddingTop: layout.grid,
  paddingRight: layout.pad,
  paddingBottom: layout.grid,
  paddingLeft: 0,
  color:
    isVisited && (isEnabled || isActive)
      ? 'var(--textColorPrimary)'
      : 'var(--textColorDimmed)',
  cursor: isVisited && (isEnabled || isActive) ? 'pointer' : 'default',
  pointerEvents: isVisited && isEnabled ? undefined : 'none', // no events if active (clicking itself does nothing)
}));

const StepListFiller = styled.div(() => ({
  // flex child of StepList: grows to fill void space under items to keep item heights as
  //  short as possible
  flex: '1 1 auto',

  width: 1,
  height: 1,
}));

const StepList = styled.div(() => ({
  flex: '0 1 auto', // flex child of StepListContainer
  display: 'flex',
  flexDirection: 'column',
  minWidth: layout.grid * 50,
}));

const LeftSection = styled.div(() => ({
  flex: '1 0 auto', // flex child of Overlay, grows only, faster than RightSection
  ...sectionPadding,
  paddingRight: 0, // required in order to have effect of active step bar extending to MainSection
  minWidth: 200,
  width: leftRightSectionWidth,
  height: '100%',
  display: 'flex',
  justifyContent: 'flex-end',
}));

const Overlay = styled.div(() => ({
  position: 'absolute',
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  backgroundColor: overlayBkColor,
  padding: 0,

  'h1, h2, h3': {
    color: 'var(--textColorAccent)',
    fontWeight: 'bold',
  },

  h1: {
    fontSize: 24,
  },

  h2: {
    fontSize: 18,
  },
}));

//
// Component
//

/**
 * Determines if a step is reachable. A step is reachable if all previous steps
 *  are validated and all previous steps enable their Next button.
 * @param {Object} wizard Wizard state.
 * @param {number} stepIdx Index of the step.
 * @returns {boolean} True if enabled; false otherwise.
 */
const isStepReachable = function (wizard, stepIdx) {
  if (stepIdx <= 0) {
    return true; // first step always accessible
  }

  const orderedSteps = Object.values(wizard.steps).sort((left, right) => {
    return left.stepIndex - right.stepIndex;
  });

  const step = orderedSteps[stepIdx];
  if (!step.visited) {
    return false; // must have been visited
  }

  const prevSteps = orderedSteps.slice(0, stepIdx);
  return prevSteps.every((s) => s.validated && s.nextEnabled);
};

export const Wizard = function (props) {
  //
  // PROPS
  //

  const { children, title } = props;

  /* istanbul ignore else -- we don't run tests with the flag disabled */
  if (DEV_ENV) {
    // PERFORMANCE: only verify props when they change
    // eslint-disable-next-line react-hooks/rules-of-hooks -- DEV_ENV never changes at runtime
    useMemo(
      function () {
        rtv.verify(
          {
            props: { title, children },
          },
          {
            props: {
              children: [
                (v) => {
                  if (Children.count(v) < 1) {
                    throw new Error('At least 1 child WizardStep is required');
                  }
                },
              ],
              title: rtv.STRING,
            },
          }
        );
      },
      [title, children]
    );
  }

  const childList = Children.toArray(children);

  //
  // STATE
  //

  // internal wizard state
  // @type {{ steps: { [index: string]: { validated: boolean, nextEnabled: boolean, visited: boolean, stepIndex: number } } }}
  // - steps is a map of step ID to last-reported step state
  const wizard = useRef({ steps: {} });

  // counter to signal change to wizard state because we're using a ref (that doesn't trigger
  //  a re-render on change like state does) so that we can have the freedom to update the
  //  wizard's state in a render pass; if we made `wizard` actual state (via `useState()`),
  //  we'd end-up in an equally messy situation when looping children on render and looking
  //  for new children to initialize as steps in `wizard`
  const [wizardUpdate, setWizardUpdate] = useState(0);

  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [backEnabled, setBackEnabled] = useState(false); // we start on first step
  const [nextEnabled, setNextEnabled] = useState(true);
  const [nextWaiting, setNextWaiting] = useState(false);

  //
  // EVENTS
  //

  // changes the active step to the specified new step, completing the Wizard if the
  //  new step >= the total step count
  const changeStep = useCallback(
    function (newStepIdx) {
      let nextIdx = -1;
      let completed = false;

      /* istanbul ignore else -- defensive programming currently cannot be reached */
      if (newStepIdx !== activeStepIdx) {
        if (newStepIdx >= childList.length) {
          completed = true;
        } else if (newStepIdx > activeStepIdx) {
          nextIdx = newStepIdx;
        } else {
          // must be going backward
          nextIdx = Math.max(newStepIdx, 0);
          /* istanbul ignore else -- defensive programming currently cannot be reached */
          if (nextIdx === activeStepIdx) {
            nextIdx = -1; // no need to change anything afterall
          }
        }
      }

      if (nextIdx >= 0) {
        if (nextIdx > activeStepIdx) {
          // moving forward implies active step is validated
          const activeChild = childList[activeStepIdx];
          wizard.current.steps[activeChild.props.id].validated = true;
        }

        const nextChild = childList[nextIdx];
        const nextChildState = wizard.current.steps[nextChild.props.id];
        nextChildState.visited = true;

        setNextEnabled(nextChildState.nextEnabled);
        setBackEnabled(nextIdx > 0); // disable Back on first step
        setActiveStepIdx(nextIdx);
      } /* istanbul ignore else -- defensive programming currently cannot be reached */ else if (
        completed
      ) {
        // completing implies active step is validated (and it can't already be validated,
        //  otherwise the Wizard would've already completed beforehand
        const activeChild = childList[activeStepIdx];
        wizard.current.steps[activeChild.props.id].validated = true;
        setWizardUpdate(wizardUpdate + 1); // change in step validated state requires re-render now

        const onComplete = props.onComplete;
        if (typeof onComplete === 'function') {
          onComplete();
        }
      }
    },
    [wizardUpdate, activeStepIdx, childList, props.onComplete]
  );

  // nextIdx is the index of the step where to go on next, which is not necessarily the
  //  next one in sequence if user is clicking on a forward step they previously visited
  const navigate = useCallback(
    function (nextIdx) {
      if (nextIdx < activeStepIdx) {
        const onBack = props.onBack;
        if (typeof onBack === 'function') {
          // NOTE: Back button is disabled/hidden on first step, so it should not be possible
          //  to have a situation where `nextIdx` is < 0
          onBack({ nextIndex: nextIdx });
        }

        changeStep(nextIdx);
      } else {
        const onNext = props.onNext;
        if (typeof onNext === 'function') {
          const handleInvalid = () => {
            const activeChild = childList[activeStepIdx];
            if (wizard.current.steps[activeChild.props.id].validated) {
              wizard.current.steps[activeChild.props.id].validated = false;
              setWizardUpdate(wizardUpdate + 1); // change in step validated state requires re-render now
            }
          };

          const child = childList[activeStepIdx];
          const result = onNext({
            step: child.props,
            stepIndex: activeStepIdx,
            nextIndex: nextIdx >= childList.length ? -1 : nextIdx,
            isLast: activeStepIdx >= childList.length - 1,
          });

          if (result instanceof Promise) {
            setNextWaiting(true);
            result
              .then(
                () => {
                  changeStep(nextIdx);
                },
                (err) => {
                  // validation failed: stay on current step
                  handleInvalid();
                  if (err?.message) {
                    Notifications.error(err.message, { timeout: 0 }); // require user to dismiss
                  }
                }
              )
              .finally(() => setNextWaiting(false));
          } else if (result === undefined || result) {
            changeStep(nextIdx);
          } else {
            // falsy (other than undefined) means invalid: stay on current step
            handleInvalid();
          }
        } else {
          changeStep(nextIdx);
        }
      }
    },
    [
      wizardUpdate,
      activeStepIdx,
      changeStep,
      childList,
      props.onBack,
      props.onNext,
    ]
  );

  const handleBackClick = useCallback(
    function () {
      navigate(activeStepIdx - 1);
    },
    [navigate, activeStepIdx]
  );

  const handleNextClick = useCallback(
    function () {
      navigate(activeStepIdx + 1);
    },
    [activeStepIdx, navigate]
  );

  // NOTE: we handle this internally so as not to pass the click event through
  //  which is what would happen if we put the onCancel prop directly on to
  //  the CloseButton's onClick handler
  const handleCancelClick = useCallback(
    function () {
      const onCancel = props.onCancel;
      if (typeof onCancel === 'function') {
        onCancel();
      }
    },
    [props.onCancel]
  );

  const handleStepChange = useCallback(
    function (params) {
      const { stepIndex, validated, nextEnabled: stepNextEnabled } = params;
      const child = childList[stepIndex];

      // call consumer's individual Step onChange event handler, if any
      if (typeof child.props.onChange === 'function') {
        child.props.onChange(params);
      }

      // NOTE: allow for some properties NOT to be defined when updating state, effectively
      //  merging them into current state
      const stepState = wizard.current.steps[child.props.id];

      if (validated !== undefined && stepState.validated !== validated) {
        stepState.validated = validated;
        setWizardUpdate(wizardUpdate + 1); // change in step validated state requires re-render now
      }

      stepState.nextEnabled = stepNextEnabled ?? stepState.nextEnabled;
      setNextEnabled(stepState.nextEnabled);
    },
    [wizardUpdate, childList]
  );

  // NOTE: not expecting clicks when item is disabled (not visited or Next is disabled
  //  and step is ahead of current
  const handleStepListItemClick = useCallback(
    function (event) {
      const stepIndex = parseInt(event.currentTarget.dataset.stepIndex);

      if (activeStepIdx < stepIndex) {
        // user wants to go forward, which means the step has to be OK with going next
        navigate(stepIndex);
      } else {
        changeStep(stepIndex);
      }
    },
    [activeStepIdx, navigate, changeStep]
  );

  const handleOverlayKeyDown = useCallback(
    function (event) {
      if (event.code === 'Escape') {
        event.stopPropagation();
        handleCancelClick();
      }
    },
    [handleCancelClick]
  );

  //
  // EFFECTS
  //

  //
  // RENDER
  //

  const { className, lastLabel } = props;

  const nextLabel =
    activeStepIdx >= childList.length - 1
      ? lastLabel || strings.wizard.finish()
      : strings.wizard.next();

  const steps = childList.map((child, stepIndex) => {
    const {
      props: { id },
    } = child;

    wizard.current.steps[id] = {
      // initial state
      validated: true, // assume valid unless told otherwise
      nextEnabled,
      visited: stepIndex === activeStepIdx,

      // overwrite with existing state if step was already defined
      ...wizard.current.steps[id],

      stepIndex, // always overwrite existing with new index if number of steps has changed
    };

    return cloneElement(child, {
      onChange: handleStepChange,
      stepIndex,
    });
  });

  const activeChild = childList[activeStepIdx];
  const activeStepState = wizard.current.steps[activeChild.props.id];

  return (
    <Overlay className={className} onKeyDown={handleOverlayKeyDown}>
      <LeftSection>
        <StepList>
          {steps.map((step, idx) => (
            <StepListItem
              key={step.props.stepIndex}
              isActive={idx === activeStepIdx}
              isVisited={activeStepState.visited}
              isEnabled={isStepReachable(wizard.current, idx)}
              data-step-index={idx}
              onClick={handleStepListItemClick}
            >
              <StepListItemNumber>{idx + 1}</StepListItemNumber>
              <StepListItemLabel>
                {step.props.label || step.props.title}
              </StepListItemLabel>
            </StepListItem>
          ))}
          <StepListFiller />
        </StepList>
      </LeftSection>
      <MainSection>
        <Header>
          <h1>{title}</h1>
        </Header>
        <StepContainer>{steps[activeStepIdx]}</StepContainer>
        <Footer>
          {backEnabled ? (
            <Button
              primary
              label={strings.wizard.back()}
              onClick={handleBackClick}
            />
          ) : (
            <BackPlaceholder />
          )}
          <Button
            primary
            label={nextLabel}
            onClick={handleNextClick}
            disabled={!nextEnabled || nextWaiting}
            waiting={nextWaiting}
          />
        </Footer>
      </MainSection>
      <RightSection>
        <CloseButton onClick={handleCancelClick} />
      </RightSection>
    </Overlay>
  );
};

Wizard.propTypes = {
  /**
   * Children are expected to be WizardStep components, and there must be at least 1.
   */
  children: propTypes.oneOfType([
    propTypes.node,
    propTypes.arrayOf(propTypes.node),
  ]).isRequired,

  /**
   * Class name for the Overlay.
   */
  className: propTypes.string,

  /**
   * Label for the Next button when the Wizard reaches the last step.
   *
   * Default: "Finish"
   */
  lastLabel: propTypes.string,

  /**
   * Wizard title.
   */
  title: propTypes.string.isRequired,

  //// EVENTS

  /**
   * Called if the user clicks the Back button.
   *
   * Signature: `(info: { nextIndex: number }) => void`
   *
   * - `info.nextIndex`: Index of the step to which the Wizard will navigate backward
   *     (not necessarily in sequence if the user clicked on a previous step's label
   *     in the step list).
   */
  onBack: propTypes.func,

  /**
   * Called if the user cancels the Wizard.
   *
   * Signature: `() => void`
   */
  onCancel: propTypes.func,

  /**
   * Called when the user exits the Wizard after completing all steps.
   *
   * Signature: `() => void`
   */
  onComplete: propTypes.func,

  /**
   * Called when the user clicks on the Next/Finish button.
   *
   * Signature: `(info: { step: Object, stepIndex: number, nextIndex: number, isLast: boolean }) => void | boolean | Promise<void>`
   *
   * - `info.step`: All props originally given to the current step.
   * - `info.stepIndex`: Index of the step in the Wizard.
   * - `info.nextIndex`: Index of the step to which the Wizard will navigate next (not
   *     necessarily the one immediately following the current step if the user clicked
   *     on a previous-visited step in the Wizard's step list). If this is the last step,
   *     this property will be set to `-1` (and `info.isLast` will be `true`).
   * - `info.isLast`: True if the step identified by `info.stepIndex` (i.e. the current step) is
   *     the last one and the Wizard will be completed if allowed to go forward; false otherwise.
   * - Returns: If a promise is returned, the Wizard waits for it to resolve before
   *     proceeding to the next step or completing the wizard. If nothing or a truthy value
   *     is returned, the Wizard doesn't wait and proceeds. In either case, the step is considered
   *     validated. If the promise is rejected or a falsy value (other than `undefined`) is returned,
   *     the step is considered invalid and the Wizard does not proceed.
   *     - NOTE: An invalid step means __all__ following steps become inaccessible even if already
   *         visited.
   *
   * NOTE: Use the step's `onChange()` event to signal to the Wizard that the Next
   *  button should be disabled to prevent the user from moving forward.
   */
  onNext: propTypes.func,
};
