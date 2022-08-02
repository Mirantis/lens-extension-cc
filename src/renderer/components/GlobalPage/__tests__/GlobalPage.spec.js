import mockConsole from 'jest-mock-console';
import { render, screen } from 'testingUtility';
import { GlobalPage } from '../GlobalPage';
import { CloudProvider } from '../../../store/CloudProvider';
import { IpcRenderer } from '../../../IpcRenderer';
import { CloudStore } from '../../../../store/CloudStore';
import { themeModes } from '../../theme';
import * as strings from '../../../../strings';

describe('/renderer/components/GlobalPage/GlobalPage', () => {
  const extension = {};

  beforeEach(() => {
    mockConsole(); // automatically restored after each test

    IpcRenderer.createInstance(extension);
    CloudStore.createInstance().loadExtension(extension);
  });

  [themeModes.LIGHT, themeModes.DARK].forEach((themeMode) => {
    describe(`|${themeMode}| mode`, () => {
      beforeEach(() => {
        if (themeMode === themeModes.LIGHT) {
          document.querySelector('body').classList.add('theme-light');
        } else {
          document.querySelector('body').classList.remove('theme-light');
        }
      });

      it('showing WelcomeView after rendering GlobalPage component', () => {
        render(
          <CloudProvider>
            <GlobalPage />
          </CloudProvider>
        );

        expect(screen.getByText(strings.welcome.description())).toHaveStyle(
          'color: var(--textColorPrimary);'
        );
      });
    });
  });
});
