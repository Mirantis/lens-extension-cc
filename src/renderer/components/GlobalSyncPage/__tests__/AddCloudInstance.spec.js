import mockConsole from 'jest-mock-console';
import { render, screen, sleep, act } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { AddCloudInstance } from '../AddCloudInstance';
import { MOCK_CONNECT_FAILURE_CLOUD_NAME } from '../../../../common/Cloud'; // MOCKED
import { CloudProvider } from '../../../store/CloudProvider';
import { IpcRenderer } from '../../../IpcRenderer';
import { CloudStore } from '../../../../store/CloudStore';
import * as strings from '../../../../strings';

jest.mock('../../../../common/Cloud');
jest.mock('../../../../common/DataCloud', () => {
  const { DATA_CLOUD_EVENTS } = jest.requireActual(
    '../../../../common/DataCloud'
  );

  return {
    __esModule: true,
    DATA_CLOUD_EVENTS,
    DataCloud: class {
      constructor({ cloud }) {
        this.cloud = cloud;
        this.namespaces = [];

        this._events = [];
        this._eventHandlers = [];

        // immediately (but asynchronously) loaded data cloud
        this.loading = false;
        this.dispatchEvent(DATA_CLOUD_EVENTS.LOADED, this);
      }

      destroy() {}

      addEventListener(name, handler) {
        this._eventHandlers.push({ name, handler });
      }

      removeEventListener(name, handler) {
        const idx = this._eventHandlers.findIndex(
          ({ name: n, handler: h }) => n === name && h === handler
        );
        if (idx >= 0) {
          this._eventHandlers.splice(idx, 1);
        }
      }

      dispatchEvent(name, ...params) {
        this._events.push({ name, params });
        this._scheduleDispatch();
      }

      _scheduleDispatch() {
        setTimeout(() => {
          const events = this._events;
          this._events = [];
          events.forEach(({ name: eventName, params }) => {
            this._eventHandlers
              .filter(({ name }) => name === eventName)
              .forEach(({ name, handler }) => {
                handler({ name, target: this }, ...params);
              });
          });
        });
      }
    },
  };
});

describe('/renderer/components/GlobalSyncPage/AddCloudInstance', () => {
  const extension = {};
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    mockConsole(['log', 'info', 'warn']); // automatically restored after each test

    const ipcRenderer = IpcRenderer.createInstance(extension);
    CloudStore.createInstance().loadExtension(extension, { ipcRenderer });
  });

  describe('render', () => {
    it('renders component', () => {
      render(
        <CloudProvider>
          <AddCloudInstance onCancel={() => {}} onAdd={() => {}} />
        </CloudProvider>
      );

      expect(
        screen.getByText(strings.connectionBlock.title())
      ).toBeInTheDocument();
    });
  });

  describe('add new cloud', () => {
    ['foo', MOCK_CONNECT_FAILURE_CLOUD_NAME].forEach((testCloudName) => {
      it(`triggers |${
        testCloudName === MOCK_CONNECT_FAILURE_CLOUD_NAME ? 'failed' : 'success'
      }| cloud connect scenario`, async () => {
        render(
          <CloudProvider>
            <AddCloudInstance onCancel={() => {}} onAdd={() => {}} />
          </CloudProvider>
        );

        const testUrl = 'https://foo.com/';
        const inputNameEl = document.getElementById('cclex-cluster-name');
        const inputUrlEl = document.getElementById('cclex-cluster-url');

        await user.type(inputNameEl, testCloudName);
        await user.type(inputUrlEl, testUrl);

        await act(
          async () =>
            await user.click(
              screen.getByText(strings.connectionBlock.button.label())
            )
        );

        await sleep(30); // should be more than enough for all mocked timeouts to fire

        if (testCloudName === MOCK_CONNECT_FAILURE_CLOUD_NAME) {
          expect(
            screen.queryByText(strings.synchronizeBlock.title())
          ).not.toBeInTheDocument();
          expect(
            document.querySelector('.notification.error')
          ).toHaveTextContent(strings.cloudConnectionErrors.connectionError());
        } else {
          expect(
            screen.getByText(strings.synchronizeBlock.title())
          ).toBeInTheDocument();
        }
      });
    });
  });
});
