import { render, expectErrorBoundary } from 'testingUtility';
import { WizardStep } from '../WizardStep';

describe('/renderer/components/Wizard/WizardStep', () => {
  const title = 'Step title';
  const id = 'step-id';

  let TestWizardStep;

  beforeEach(() => {
    // eslint-disable-next-line react/display-name
    TestWizardStep = (props) => (
      <WizardStep title={title} id={id} {...props}>
        {props.children || (() => <p>content</p>)}
      </WizardStep>
    );
  });

  describe('API', () => {
    describe('props', () => {
      describe('#children', () => {
        it('calls the render function with step props', () => {
          const handler = jest.fn();
          render(<TestWizardStep>{handler}</TestWizardStep>);

          expect(handler).toHaveBeenCalled();
          expect(handler.mock.calls[0][0]).toEqual({
            step: {
              children: handler,
              title,
              id,
            },
          });
        });
      });

      describe('#id', () => {
        it('requires a non-empty id', () => {
          expectErrorBoundary(
            <TestWizardStep title={title} id="" />,
            'Verification failed: path="/props/id"'
          );
        });
      });

      describe('#title', () => {
        it('requires a non-empty title', () => {
          expectErrorBoundary(
            <TestWizardStep title="" id={id} />,
            'Verification failed: path="/props/title"'
          );
        });
      });
    });
  });
});
