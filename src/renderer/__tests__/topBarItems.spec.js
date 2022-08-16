import mockConsole from 'jest-mock-console';
import { render, screen } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { ROUTE_GLOBAL_PAGE } from '../../routes';
import * as strings from '../../strings';
import * as topBarItems from '../topBarItems';

describe('/renderer/components/EnhancedTable/TableRowListenerWrapper', () => {
  const extension = {
    navigate: (route) => {
      // eslint-disable-next-line no-console --- needed for testing onClick handled in TopBarExtension
      console.log(`Navigated to ${route}`);
    },
  };
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    mockConsole(['log', 'info', 'warn']); // automatically restored after each test
  });

  describe('generateTopBarItems()', () => {
    const TopBarItem =
      topBarItems.generateTopBarItems(extension)[0].components.Item;

    it('generare only 1 top bar item', () => {
      expect(topBarItems.generateTopBarItems(extension).length).toEqual(1);
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

      expect(document.querySelector('svg')).toHaveStyle(`fill: ${colorNormal}`);

      await user.hover(document.querySelector('svg'));
      expect(document.querySelector('svg')).toHaveStyle(`fill: ${colorHover}`);

      await user.unhover(document.querySelector('svg'));
      expect(document.querySelector('svg')).toHaveStyle(`fill: ${colorNormal}`);
    });

    it('triggers', async () => {
      const logSpy = jest.spyOn(console, 'log');
      const searchInMultiDim = (arr, str) => {
        return (
          arr.find((t) => {
            return t.find((i) => i === str);
          }) && true
        );
      };

      render(<TopBarItem />);

      await user.click(
        screen.getByText(strings.extension.topBar['label']()).parentNode
      );

      expect(
        searchInMultiDim(logSpy.mock.calls, `Navigated to ${ROUTE_GLOBAL_PAGE}`)
      ).toBe(true);
    });
  });
});
