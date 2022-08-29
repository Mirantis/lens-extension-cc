import mockConsole from 'jest-mock-console';
import { render, screen } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { ROUTE_GLOBAL_PAGE } from '../../routes';
import * as strings from '../../strings';
import * as topBarItems from '../topBarItems';

describe('/renderer/topBarItems', () => {
  const extension = {
    navigate: jest.fn(),
  };

  let user;

  beforeEach(() => {
    user = userEvent.setup();
    mockConsole(['log', 'info', 'warn']); // automatically restored after each test
  });

  describe('generateTopBarItems()', () => {
    it('generate only one top bar item', () => {
      expect(topBarItems.generateTopBarItems(extension).length).toEqual(1);
    });

    describe('First top bar item', () => {
      let TopBarItem;

      beforeEach(() => {
        TopBarItem =
          topBarItems.generateTopBarItems(extension)[0].components.Item;
      });

      it('renders top bar item', () => {
        render(<TopBarItem />);

        expect(
          screen.getByText(strings.extension.topBar['label']())
        ).toBeInTheDocument();
      });

      it('change GlobalPage icon color on hover', async () => {
        render(<TopBarItem />);

        const colorNormal = 'var(--textColorPrimary)';
        const colorHover = 'var(--textColorSecondary)';

        expect(document.querySelector('svg')).toHaveStyle(
          `fill: ${colorNormal}`
        );

        await user.hover(document.querySelector('svg'));
        expect(document.querySelector('svg')).toHaveStyle(
          `fill: ${colorHover}`
        );

        await user.unhover(document.querySelector('svg'));
        expect(document.querySelector('svg')).toHaveStyle(
          `fill: ${colorNormal}`
        );
      });

      it('calls navigate handler by clicking on bar item', async () => {
        render(<TopBarItem />);

        await user.click(
          screen.getByText(strings.extension.topBar['label']()).parentNode
        );

        expect(extension.navigate).toHaveBeenCalledTimes(1);
        expect(extension.navigate).toHaveBeenCalledWith(ROUTE_GLOBAL_PAGE);
      });
    });
  });
});
