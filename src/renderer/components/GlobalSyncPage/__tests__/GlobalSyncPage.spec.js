import mockConsole from 'jest-mock-console';
import { render, screen } from 'testingUtility';
import { GlobalSyncPage } from '../GlobalSyncPage';
import { CloudProvider } from '../../../store/CloudProvider';
import { IpcRenderer } from '../../../IpcRenderer';
import { globalCloudStore } from '../../../../store/CloudStore';
import { themeModes } from '../../theme';
import * as strings from '../../../../strings';

describe('/renderer/components/GlobalSyncPage/GlobalSyncPage', () => {
  const extension = {};
  let ipcRenderer;

  beforeEach(() => {
    mockConsole(['log', 'info', 'warn']); // automatically restored after each test

    ipcRenderer = IpcRenderer.createInstance(extension);
    globalCloudStore.loadExtension(extension, { ipcRenderer });
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

      it('showing WelcomeView after rendering GlobalSyncPage component', () => {
        render(
          <CloudProvider>
            <GlobalSyncPage />
          </CloudProvider>
        );

        expect(screen.getByText(strings.welcome.description())).toHaveStyle(
          'color: var(--textColorPrimary);'
        );
      });
    });
  });
});
