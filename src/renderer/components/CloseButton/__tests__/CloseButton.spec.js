import { render, screen } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { CloseButton } from '../CloseButton';
import * as strings from '../../../../strings';

describe('/renderer/components/CloseButton', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it(`renders an X and an "${strings.closeButton.title()}" label`, () => {
    render(<CloseButton onClick={() => {}} />);

    const buttonEl = screen.getByRole('button');
    expect(buttonEl).toHaveAttribute('aria-label', strings.closeButton.label());
    expect(buttonEl.querySelector('i[material="close"]')).toBeInTheDocument();
    expect(
      buttonEl.parentNode.querySelector('[aria-hidden]')
    ).toHaveTextContent(strings.closeButton.title());
  });

  // NOTE: title has pointer events disabled so isn't clickable
  ['icon', 'wrapper'].forEach((part) => {
    it(`clicking on |${part}| triggers onClick handler`, async () => {
      const handler = jest.fn();
      render(<CloseButton onClick={handler} />);

      const buttonEl = screen.getByRole('button');
      let triggerEl;

      if (part === 'icon') {
        triggerEl = buttonEl.querySelector('i[material="close"]');
      } else if (part === 'wrapper') {
        triggerEl = buttonEl.parentNode;
      } else {
        throw new Error(`Unknown part=${part}`);
      }

      await user.click(triggerEl);
      expect(handler).toHaveBeenCalled();
    });
  });
});
