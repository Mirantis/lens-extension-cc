import mockConsole from 'jest-mock-console';
import { render, screen } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { AddCloudInstance } from '../AddCloudInstance';
import { MOCK_CONNECT_FAILURE_CLOUD_NAME } from '../../../../common/Cloud'; // MOCKED
import { CloudProvider } from '../../../store/CloudProvider';
import { IpcRenderer } from '../../../IpcRenderer';
import { CloudStore } from '../../../../store/CloudStore';
import * as strings from '../../../../strings';

jest.mock('../../../../common/Cloud');
jest.mock('../../../../common/DataCloud');

const searchInMultiDim = (arr, str) => {
  return (
    arr.find((t) => {
      return t.find((i) => i === str);
    }) && true
  );
};

describe('/renderer/components/GlobalPage/AddCloudInstance', () => {
  const extension = {};
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    mockConsole(['log', 'info', 'warn']); // automatically restored after each test

    IpcRenderer.createInstance(extension);
    CloudStore.createInstance().loadExtension(extension);
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
        const logSpy = jest.spyOn(console, 'log');

        render(
          <CloudProvider>
            <AddCloudInstance onCancel={() => {}} onAdd={() => {}} />
          </CloudProvider>
        );

        const testUrl = 'https://foo.com/';
        const inputNameEl = document.getElementById('lecc-cluster-name');
        const inputUrlEl = document.getElementById('lecc-cluster-url');

        await user.type(inputNameEl, testCloudName);
        await user.type(inputUrlEl, testUrl);

        await user.click(
          screen.getByText(strings.connectionBlock.button.label())
        );

        if (testCloudName === MOCK_CONNECT_FAILURE_CLOUD_NAME) {
          expect(
            searchInMultiDim(
              logSpy.mock.calls,
              `${testCloudName} cloud is disconnected!`
            )
          ).toBe(true);
        } else {
          expect(
            searchInMultiDim(
              logSpy.mock.calls,
              `${testCloudName} cloud is connected!`
            )
          ).toBe(true);
        }
      });
    });
  });
});
