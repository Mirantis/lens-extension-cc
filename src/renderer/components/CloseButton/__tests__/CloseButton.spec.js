import { render, screen } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { CloseButton } from '../CloseButton';
import { closeButton } from '../../../../strings';

// DEBUG TEST: write a test for a TypeScript file, make sure that works...

describe('/renderer/components/CloseButton', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it(`renders an X and an "${closeButton.title()}" label`, () => {
    render(<CloseButton />);

    screen.debug();

    const buttonEl = screen.getByRole('button');
    expect(buttonEl).toHaveAttribute('aria-label', closeButton.label());
    // DEBUG TEST: check close icon, check ESC text under it
  });

  // DEBUG TEST: click on icon or ESC triggers onClick handler
});
