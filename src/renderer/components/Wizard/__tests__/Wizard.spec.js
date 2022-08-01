import { useState } from 'react';
import {
  render,
  screen,
  expectErrorBoundary,
  act,
  waitFor,
} from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { WizardStep } from '../WizardStep';
import { Wizard } from '../Wizard';
import * as strings from '../../../../strings';

/**
 * Gets various elements in the rendered Wizard.
 * @param {Object} [options]
 * @param {string} [options.lastLabel] Expected label of the Finish button if it's not
 *  the default.
 */
const getParts = ({ lastLabel } = {}) => {
  const nextEl = screen.queryByRole('button', { name: strings.wizard.next() });
  const finishEl = screen.queryByRole('button', {
    name: lastLabel || strings.wizard.finish(),
  });

  return {
    backEl: screen.queryByRole('button', { name: strings.wizard.back() }),
    nextEl,
    finishEl,
    forwardEl: nextEl || finishEl, // convenience when not specifically testing for Next vs Finish
    cancelEl: screen.queryByRole('button', {
      name: strings.closeButton.label(),
    }),
    stepListItems: document.querySelectorAll('[class*="-StepListItem "]'),
  };
};

describe('/renderer/components/Wizard/Wizard', () => {
  const stepTitle = 'Step title';
  const stepId = 'step-id';
  const wizardTitle = 'Wizard title';

  let user;
  let TestWizardStep;
  let TestWizard;

  beforeEach(() => {
    user = userEvent.setup();

    // eslint-disable-next-line react/display-name
    TestWizardStep = (props) => (
      <WizardStep title={stepTitle} id={stepId} {...props}>
        {props.children ||
          (({ step: { stepIndex } }) => (
            <p data-testid={props.id || stepId}>Step {stepIndex}</p>
          ))}
      </WizardStep>
    );

    // eslint-disable-next-line react/display-name
    TestWizard = ({ stepCount = 2, ...props }) => {
      let children = props.children;
      if (!children) {
        children = Array.from({ length: stepCount }).map((_, i) => (
          <TestWizardStep key={i} title={`Title ${i}`} id={`step-${i}`} />
        ));
      }

      return (
        <Wizard title={wizardTitle} id={stepId} {...props}>
          {children}
        </Wizard>
      );
    };
  });

  describe('API', () => {
    describe('props', () => {
      describe('#children', () => {
        it('requires at least one child', () => {
          expectErrorBoundary(
            <TestWizard stepCount={0} />,
            'Verification failed: path="/props/children"'
          );
        });

        it('calls the render function with step props including those set by Wizard', async () => {
          const handler = jest.fn();

          render(
            <TestWizard>
              <TestWizardStep id={stepId} title={stepTitle}>
                {handler}
              </TestWizardStep>
            </TestWizard>
          );

          expect(handler).toHaveBeenCalled();
          expect(handler.mock.calls[0][0]).toEqual({
            step: {
              children: handler,
              title: stepTitle,
              id: stepId,
              onChange: handler.mock.calls[0][0].step.onChange, // given by Wizard
              stepIndex: 0,
            },
          });
          expect(typeof handler.mock.calls[0][0].step.onChange).toBe(
            'function'
          );
        });

        it('handles new children added dynamically', async () => {
          const handler0 = jest.fn();
          const handler1 = jest.fn();
          const handler2 = jest.fn();
          const stepIds = ['zero', 'one', 'two'];
          const stepTitles = ['one', 'two', 'three'];
          const testId = 'add-step';

          const TestContainer = () => {
            const [added, setAdded] = useState(false);

            return (
              <>
                <TestWizard>
                  <TestWizardStep id={stepIds[0]} title={stepTitles[0]}>
                    {handler0}
                  </TestWizardStep>
                  {added ? (
                    <TestWizardStep id={stepIds[2]} title={stepTitles[2]}>
                      {handler2}
                    </TestWizardStep>
                  ) : null}
                  <TestWizardStep id={stepIds[1]} title={stepTitles[1]}>
                    {handler1}
                  </TestWizardStep>
                </TestWizard>
                <button onClick={() => setAdded(true)} data-testid={testId}>
                  add
                </button>
              </>
            );
          };

          render(<TestContainer />);

          expect(handler0).toHaveBeenCalled();
          expect(handler1).not.toHaveBeenCalled();
          expect(handler2).not.toHaveBeenCalled();
          expect(handler0.mock.calls[0][0]).toEqual({
            step: {
              children: handler0,
              title: stepTitles[0],
              id: stepIds[0],
              onChange: handler0.mock.calls[0][0].step.onChange, // given by Wizard
              stepIndex: 0,
            },
          });
          expect(typeof handler0.mock.calls[0][0].step.onChange).toBe(
            'function'
          );

          // NEXT
          await user.click(getParts().nextEl);

          expect(handler1).toHaveBeenCalled();
          expect(handler2).not.toHaveBeenCalled();
          expect(handler1.mock.calls[0][0]).toEqual({
            step: {
              children: handler1,
              title: stepTitles[1],
              id: stepIds[1],
              onChange: handler1.mock.calls[0][0].step.onChange, // given by Wizard
              stepIndex: 1,
            },
          });
          expect(typeof handler1.mock.calls[0][0].step.onChange).toBe(
            'function'
          );

          // BACK
          await user.click(getParts().backEl);
          // ADD STEP in middle
          await user.click(screen.getByTestId(testId));

          handler0.mockReset();
          handler1.mockReset();

          expect(handler0).not.toHaveBeenCalled(); // was already rendered
          expect(handler1).not.toHaveBeenCalled();
          expect(handler2).not.toHaveBeenCalled();

          await user.click(getParts().nextEl);

          expect(handler2).toHaveBeenCalled();
          expect(handler1).not.toHaveBeenCalled();
          expect(handler2.mock.calls[0][0]).toEqual({
            step: {
              children: handler2,
              title: stepTitles[2],
              id: stepIds[2],
              onChange: handler2.mock.calls[0][0].step.onChange, // given by Wizard
              stepIndex: 1,
            },
          });
          expect(typeof handler2.mock.calls[0][0].step.onChange).toBe(
            'function'
          );

          await user.click(getParts().nextEl);

          expect(handler1).toHaveBeenCalled();
          expect(handler1.mock.calls[0][0]).toEqual({
            step: {
              children: handler1,
              title: stepTitles[1],
              id: stepIds[1],
              onChange: handler1.mock.calls[0][0].step.onChange, // given by Wizard
              stepIndex: 2,
            },
          });
          expect(typeof handler1.mock.calls[0][0].step.onChange).toBe(
            'function'
          );
        });
      });

      describe('#lastLabel', () => {
        it(`defaults to ${strings.wizard.finish()}`, () => {
          render(<TestWizard stepCount={1} />);

          expect(getParts().finishEl).toBeInTheDocument();
        });

        it('sets the label of the last Next button in sequence', () => {
          const lastLabel = 'foo';
          render(<TestWizard stepCount={1} lastLabel={lastLabel} />);

          expect(getParts({ lastLabel }).finishEl).toBeInTheDocument();
        });
      });

      describe('#title', () => {
        it('requires a non-empty title', () => {
          expectErrorBoundary(
            <TestWizard title="" />,
            'Verification failed: path="/props/title"'
          );
        });
      });
    });

    describe('events', () => {
      describe('#onBack', () => {
        it('gets called when Back is clicked', async () => {
          const handler = jest.fn();
          render(<TestWizard onBack={handler} />);

          expect(handler).not.toHaveBeenCalled();

          await user.click(getParts().nextEl);
          expect(handler).not.toHaveBeenCalled();

          await user.click(getParts().backEl);
          expect(handler).toHaveBeenCalledTimes(1);
          expect(handler.mock.calls[0][0]).toEqual({
            nextIndex: 0,
          });
        });
      });

      describe('#onCancel', () => {
        it('gets called when user clicks on ESC button', async () => {
          const handler = jest.fn();
          render(<TestWizard onCancel={handler} />);

          expect(handler).not.toHaveBeenCalled();

          await user.click(getParts().cancelEl);
          expect(handler).toHaveBeenCalledTimes(1);
        });

        it('gets called when user presses ESC key from anywhere inside Wizard', async () => {
          const handler = jest.fn();
          const testId = 'input-id';
          render(
            <TestWizard onCancel={handler}>
              <TestWizardStep>
                {() => <input type="text" data-testid={testId} />}
              </TestWizardStep>
            </TestWizard>
          );

          expect(handler).not.toHaveBeenCalled();

          const inputEl = screen.getByTestId(testId);
          inputEl.focus();
          await user.type(inputEl, '[Escape]');
          expect(handler).toHaveBeenCalledTimes(1);
        });
      });

      describe('#onComplete', () => {
        it('gets called when user clicks on Finish button', async () => {
          const handler = jest.fn();
          render(<TestWizard stepCount={1} onComplete={handler} />);

          expect(handler).not.toHaveBeenCalled();

          await user.click(getParts().finishEl);
          expect(handler).toHaveBeenCalledTimes(1);
        });
      });

      describe('#onNext', () => {
        [undefined, true].forEach((scenario) => {
          it(`gets called when user clicks Next and step changes when handler |returns ${scenario}|`, async () => {
            const handler = jest.fn(() => scenario);
            render(<TestWizard onNext={handler} />);

            expect(handler).not.toHaveBeenCalled();
            expect(screen.getByTestId('step-0')).toBeInTheDocument();
            expect(screen.queryByTestId('step-1')).not.toBeInTheDocument();

            await user.click(getParts().forwardEl);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler.mock.calls[0][0]).toEqual({
              step: {
                id: 'step-0',
                title: 'Title 0',
              },
              stepIndex: 0,
              nextIndex: 1,
              isLast: false,
            });

            expect(getParts().forwardEl).not.toHaveClass('waiting');
            expect(screen.queryByTestId('step-0')).not.toBeInTheDocument();
            expect(screen.getByTestId('step-1')).toBeInTheDocument();
          });
        });

        it('gets called when user clicks Next and step changes when handler returns promise that resolves', async () => {
          jest.useFakeTimers();
          user = userEvent.setup({
            delay: null, // prevent internal use of setTimeout()
            advanceTimers(delay) {
              jest.advanceTimersByTime(delay);
            },
          });

          const timeout = 10;
          const handler = jest.fn(
            () => new Promise((resolve) => setTimeout(resolve, timeout))
          );
          render(<TestWizard onNext={handler} />);

          expect(handler).not.toHaveBeenCalled();
          expect(screen.getByTestId('step-0')).toBeInTheDocument();
          expect(screen.queryByTestId('step-1')).not.toBeInTheDocument();

          await user.click(getParts().forwardEl);
          expect(handler).toHaveBeenCalledTimes(1);
          expect(getParts().forwardEl).toHaveClass('waiting');

          act(() => jest.advanceTimersByTime(timeout));
          await waitFor(() =>
            expect(screen.queryByTestId('step-0')).not.toBeInTheDocument()
          );

          expect(screen.getByTestId('step-1')).toBeInTheDocument();
          expect(getParts().forwardEl).not.toHaveClass('waiting');

          jest.useRealTimers();
        });

        [undefined, new Error('error message')].forEach((scenario) => {
          it(`gets called when user clicks Next and prevents step changing when handler returns promise that rejects and shows |${
            scenario ? 'error notification' : 'nothing'
          }|`, async () => {
            jest.useFakeTimers();
            user = userEvent.setup({
              delay: null, // prevent internal use of setTimeout()
              advanceTimers(delay) {
                jest.advanceTimersByTime(delay);
              },
            });

            const timeout = 10;
            const handler = jest.fn(
              () =>
                new Promise((resolve, reject) =>
                  setTimeout(() => reject(scenario), timeout)
                )
            );
            render(<TestWizard onNext={handler} />);

            expect(handler).not.toHaveBeenCalled();
            expect(screen.getByTestId('step-0')).toBeInTheDocument();
            expect(screen.queryByTestId('step-1')).not.toBeInTheDocument();

            await user.click(getParts().forwardEl);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(getParts().forwardEl).toHaveClass('waiting');

            act(() => jest.advanceTimersByTime(timeout));

            // NOTE: it's important to wait for something after the above call to avoid
            //  act()-related warnings when the test runs
            if (scenario) {
              await screen.findByText(scenario.message);
              // still on step 0, Next no longer waiting
              expect(screen.getByTestId('step-0')).toBeInTheDocument();
              expect(screen.queryByTestId('step-1')).not.toBeInTheDocument();
              expect(getParts().forwardEl).not.toHaveClass('waiting');
            } else {
              // still on step 0, Next no longer waiting
              await waitFor(() =>
                expect(getParts().forwardEl).not.toHaveClass('waiting')
              );
              expect(screen.getByTestId('step-0')).toBeInTheDocument();
              expect(screen.queryByTestId('step-1')).not.toBeInTheDocument();
            }

            jest.useRealTimers();
          });
        });

        it('gets called when user clicks Finish on last step', async () => {
          const nextHandler = jest.fn();
          const completeHandler = jest.fn();
          render(
            <TestWizard
              stepCount={1}
              onNext={nextHandler}
              onComplete={completeHandler}
            />
          );

          expect(nextHandler).not.toHaveBeenCalled();
          expect(completeHandler).not.toHaveBeenCalled();
          expect(screen.getByTestId('step-0')).toBeInTheDocument();

          await user.click(getParts().finishEl);
          expect(nextHandler).toHaveBeenCalledTimes(1);
          expect(nextHandler.mock.calls[0][0]).toEqual({
            step: {
              id: 'step-0',
              title: 'Title 0',
            },
            stepIndex: 0,
            nextIndex: -1,
            isLast: true,
          });
          expect(completeHandler).toHaveBeenCalledTimes(1);
        });

        it('prevents onComplete from being called on last step if it returns false', async () => {
          const nextHandler = jest.fn(() => false);
          const completeHandler = jest.fn();
          render(
            <TestWizard
              stepCount={1}
              onNext={nextHandler}
              onComplete={completeHandler}
            />
          );

          expect(nextHandler).not.toHaveBeenCalled();
          expect(completeHandler).not.toHaveBeenCalled();
          expect(screen.getByTestId('step-0')).toBeInTheDocument();

          await user.click(getParts().finishEl);
          expect(nextHandler).toHaveBeenCalledTimes(1);
          expect(nextHandler.mock.calls[0][0]).toEqual({
            step: {
              id: 'step-0',
              title: 'Title 0',
            },
            stepIndex: 0,
            nextIndex: -1,
            isLast: true,
          });
          expect(completeHandler).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('navigation control', () => {
    describe('step list', () => {
      it('disables future steps until they are visited once', async () => {
        render(<TestWizard />);

        let { stepListItems, backEl, forwardEl } = getParts();
        expect(screen.getByTestId('step-0')).toBeInTheDocument();
        expect(stepListItems).toHaveLength(2);
        expect(stepListItems[0]).not.toHaveStyleRule('pointerEvents');
        expect(stepListItems[1]).toHaveStyleRule('pointer-events', 'none');

        await user.click(forwardEl);
        expect(screen.getByTestId('step-1')).toBeInTheDocument(); // now step 1

        ({ stepListItems, backEl, forwardEl } = getParts());
        expect(stepListItems).toHaveLength(2);
        expect(stepListItems[0]).not.toHaveStyleRule('pointerEvents');
        expect(stepListItems[1]).not.toHaveStyleRule('pointer-events'); // clickable

        await user.click(backEl);
        expect(screen.getByTestId('step-0')).toBeInTheDocument(); // back on step 0

        ({ stepListItems, backEl, forwardEl } = getParts());
        expect(stepListItems).toHaveLength(2);
        expect(stepListItems[0]).not.toHaveStyleRule('pointerEvents');
        expect(stepListItems[1]).not.toHaveStyleRule('pointer-events'); // clickable

        await user.click(stepListItems[1]);
        expect(screen.getByTestId('step-1')).toBeInTheDocument(); // now step 1
      });

      it('disables all future steps after an invalidated step and restores validated state', async () => {
        let allowNext = true;
        render(<TestWizard stepCount={4} onNext={() => allowNext} />);

        let { stepListItems, backEl, forwardEl } = getParts();
        expect(screen.getByTestId('step-0')).toBeInTheDocument();
        expect(stepListItems).toHaveLength(4);
        expect(stepListItems[0]).not.toHaveStyleRule('pointerEvents');
        expect(stepListItems[1]).toHaveStyleRule('pointer-events', 'none'); // not yet visited
        expect(stepListItems[2]).toHaveStyleRule('pointer-events', 'none'); // no yet visited
        expect(stepListItems[3]).toHaveStyleRule('pointer-events', 'none'); // no yet visited

        await user.click(forwardEl);
        expect(screen.getByTestId('step-1')).toBeInTheDocument(); // now step 1

        await user.click(forwardEl);
        expect(screen.getByTestId('step-2')).toBeInTheDocument(); // now step 2

        await user.click(forwardEl);
        expect(screen.getByTestId('step-3')).toBeInTheDocument(); // now step 3

        ({ stepListItems, backEl, forwardEl } = getParts());
        expect(stepListItems).toHaveLength(4);
        expect(stepListItems[0]).not.toHaveStyleRule('pointerEvents');
        expect(stepListItems[1]).not.toHaveStyleRule('pointer-events'); // clickable: visited
        expect(stepListItems[2]).not.toHaveStyleRule('pointer-events'); // clickable: visited
        expect(stepListItems[3]).not.toHaveStyleRule('pointer-events'); // clickable: visited

        await user.click(backEl);
        await user.click(backEl);
        expect(screen.getByTestId('step-1')).toBeInTheDocument(); // back on step 1

        ({ stepListItems, backEl, forwardEl } = getParts());
        expect(stepListItems).toHaveLength(4);
        expect(stepListItems[0]).not.toHaveStyleRule('pointerEvents');
        expect(stepListItems[1]).not.toHaveStyleRule('pointer-events'); // clickable: visited
        expect(stepListItems[2]).not.toHaveStyleRule('pointer-events'); // clickable: visited
        expect(stepListItems[3]).not.toHaveStyleRule('pointer-events'); // clickable: visited

        allowNext = false; // cause invalidation when moving to a following step

        await user.click(stepListItems[3]); // clicking any following list item implies onNext()
        expect(screen.getByTestId('step-1')).toBeInTheDocument(); // still on step 1

        ({ stepListItems, backEl, forwardEl } = getParts());
        expect(stepListItems).toHaveLength(4);
        expect(stepListItems[0]).not.toHaveStyleRule('pointerEvents'); // still clickable
        expect(stepListItems[1]).not.toHaveStyleRule('pointerEvents'); // still clickable
        expect(stepListItems[2]).toHaveStyleRule('pointer-events', 'none'); // disabled
        expect(stepListItems[3]).toHaveStyleRule('pointer-events', 'none'); // disabled

        allowNext = true; // allow moving to following steps again

        await user.click(stepListItems[0]); // can still go back to previous validated steps
        expect(screen.getByTestId('step-0')).toBeInTheDocument(); // back on step 0

        ({ stepListItems, backEl, forwardEl } = getParts());
        expect(stepListItems).toHaveLength(4);
        expect(stepListItems[0]).not.toHaveStyleRule('pointerEvents'); // still clickable
        expect(stepListItems[1]).not.toHaveStyleRule('pointerEvents'); // still clickable
        expect(stepListItems[2]).toHaveStyleRule('pointer-events', 'none'); // disabled
        expect(stepListItems[3]).toHaveStyleRule('pointer-events', 'none'); // disabled

        await user.click(forwardEl);
        expect(screen.getByTestId('step-1')).toBeInTheDocument(); // now on step 1

        ({ stepListItems, backEl, forwardEl } = getParts());
        expect(stepListItems).toHaveLength(4);
        expect(stepListItems[0]).not.toHaveStyleRule('pointerEvents'); // still clickable
        expect(stepListItems[1]).not.toHaveStyleRule('pointerEvents'); // still clickable
        expect(stepListItems[2]).toHaveStyleRule('pointer-events', 'none'); // disabled
        expect(stepListItems[3]).toHaveStyleRule('pointer-events', 'none'); // disabled

        await user.click(forwardEl);
        expect(screen.getByTestId('step-2')).toBeInTheDocument(); // now on step 2

        ({ stepListItems, backEl, forwardEl } = getParts());
        expect(stepListItems).toHaveLength(4);
        expect(stepListItems[0]).not.toHaveStyleRule('pointerEvents'); // still clickable
        expect(stepListItems[1]).not.toHaveStyleRule('pointerEvents'); // still clickable
        expect(stepListItems[2]).not.toHaveStyleRule('pointer-events'); // now clickable
        expect(stepListItems[3]).not.toHaveStyleRule('pointer-events'); // still clickable because already visited and validated before
      });
    });

    describe('step #onChange use cases', () => {
      it('calls the step onChange handler if one was specified', async () => {
        const stepImpl = ({ step: { onChange, stepIndex, id } }) => {
          // eslint-disable-next-line react-hooks/rules-of-hooks -- stepImpl is a render child which is basically a component
          const [nextEnabled, setNextEnabled] = useState(true);
          return (
            <button
              data-testid={id}
              onClick={() => {
                onChange({ stepIndex, nextEnabled: !nextEnabled });
                setNextEnabled(!nextEnabled);
              }}
            >
              Step {stepIndex}
            </button>
          );
        };
        const handler = jest.fn();

        render(
          <TestWizard>
            <TestWizardStep title="Title 0" id="step-0" onChange={handler}>
              {stepImpl}
            </TestWizardStep>
          </TestWizard>
        );

        expect(handler).not.toHaveBeenCalled();

        await user.click(screen.getByTestId('step-0'));

        expect(handler).toHaveBeenCalledTimes(1);
      });

      ['Next', 'Finish'].forEach((scenario) => {
        it(`can control enabled state of |${scenario}| button`, async () => {
          const stepImpl = ({ step: { onChange, stepIndex, id } }) => {
            // eslint-disable-next-line react-hooks/rules-of-hooks -- stepImpl is a render child which is basically a component
            const [nextEnabled, setNextEnabled] = useState(true);
            return (
              <button
                data-testid={id}
                onClick={() => {
                  onChange({ stepIndex, nextEnabled: !nextEnabled });
                  setNextEnabled(!nextEnabled);
                }}
              >
                Step {stepIndex}
              </button>
            );
          };

          render(
            <TestWizard>
              <TestWizardStep title="Title 0" id="step-0">
                {stepImpl}
              </TestWizardStep>
              <TestWizardStep title="Title 1" id="step-1">
                {stepImpl}
              </TestWizardStep>
            </TestWizard>
          );

          if (scenario === 'Next') {
            const { nextEl, finishEl } = getParts();
            expect(nextEl).toBeInTheDocument();
            expect(finishEl).not.toBeInTheDocument();
          } else {
            await user.click(getParts().forwardEl); // move to last step
            const { nextEl, finishEl } = getParts();
            expect(nextEl).not.toBeInTheDocument();
            expect(finishEl).toBeInTheDocument();
          }

          expect(getParts().forwardEl).toBeEnabled();

          await user.click(
            screen.getByTestId(`step-${scenario === 'Next' ? 0 : 1}`)
          );

          expect(getParts().forwardEl).toBeDisabled();

          await user.click(
            screen.getByTestId(`step-${scenario === 'Next' ? 0 : 1}`)
          );

          expect(getParts().forwardEl).toBeEnabled();
        });
      });

      it('can control validated state of the step', async () => {
        const stepImpl = ({ step: { onChange, stepIndex, id } }) => {
          // eslint-disable-next-line react-hooks/rules-of-hooks -- stepImpl is a render child which is basically a component
          const [validated, setValidated] = useState(true);
          return (
            <button
              data-testid={id}
              onClick={() => {
                onChange({ stepIndex, validated: !validated });
                setValidated(!validated);
              }}
            >
              Step {stepIndex}
            </button>
          );
        };

        render(
          <TestWizard>
            <TestWizardStep title="Title 0" id="step-0">
              {stepImpl}
            </TestWizardStep>
            <TestWizardStep title="Title 1" id="step-1">
              {stepImpl}
            </TestWizardStep>
          </TestWizard>
        );

        let { forwardEl, backEl, stepListItems } = getParts();

        expect(screen.getByTestId('step-0')).toBeInTheDocument();

        await user.click(forwardEl); // visit last step, implicitly validating step 0
        expect(stepListItems[0]).not.toHaveStyleRule('pointer-events');
        expect(stepListItems[1]).not.toHaveStyleRule('pointer-events');

        expect(screen.getByTestId('step-1')).toBeInTheDocument();

        ({ forwardEl, backEl, stepListItems } = getParts());

        await user.click(backEl); // back to first step
        expect(screen.getByTestId('step-0')).toBeInTheDocument();

        ({ forwardEl, backEl, stepListItems } = getParts());
        expect(stepListItems[0]).not.toHaveStyleRule('pointer-events');
        expect(stepListItems[1]).not.toHaveStyleRule('pointer-events');

        // invalidate first step, thereby disabling last step in step list
        await user.click(screen.getByTestId('step-0'));

        ({ forwardEl, backEl, stepListItems } = getParts());
        expect(stepListItems[0]).not.toHaveStyleRule('pointer-events');
        expect(stepListItems[1]).toHaveStyleRule('pointer-events', 'none'); // disabled

        // re-validate first step, thereby enabling last step in step list because
        //  visited prior
        await user.click(screen.getByTestId('step-0'));

        ({ forwardEl, backEl, stepListItems } = getParts());
        expect(stepListItems[0]).not.toHaveStyleRule('pointer-events');
        expect(stepListItems[1]).not.toHaveStyleRule('pointer-events');
      });
    });
  });
});
