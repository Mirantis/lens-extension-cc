import mockConsole from 'jest-mock-console';
import { render, screen } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { ConnectionBlock } from '../ConnectionBlock';
import { mkCloudJson, CONNECTION_STATUSES } from '../../../../common/Cloud'; // MOCKED
import { CloudProvider } from '../../../store/CloudProvider';
import { IpcRenderer } from '../../../IpcRenderer';
import { CloudStore } from '../../../../store/CloudStore';
import * as strings from '../../../../strings';

jest.mock('../../../../common/Cloud');

describe('/renderer/components/GlobalPage/ConnectionBlock', () => {
  const extension = {};
  let user;

  const TestConnectionBlockComponent = ({ loading, handleClusterConnect }) => {
    return (
      <CloudProvider>
        <ConnectionBlock
          loading={loading}
          handleClusterConnect={handleClusterConnect}
        />
      </CloudProvider>
    );
  };

  beforeEach(() => {
    user = userEvent.setup();
    mockConsole(); // automatically restored after each test

    IpcRenderer.createInstance(extension);
  });

  describe('renders', () => {
    beforeEach(() => {
      CloudStore.createInstance().loadExtension(extension);
    });

    it('renders connection block', () => {
      render(
        <TestConnectionBlockComponent
          loading={false}
          handleClusterConnect={() => {}}
        />
      );

      expect(
        screen.getByText(strings.connectionBlock.title())
      ).toBeInTheDocument();
    });

    it('shows info box by changing cluster url input after clicking on submit button', async () => {
      const handler = jest.fn();

      render(
        <TestConnectionBlockComponent
          loading={false}
          handleClusterConnect={handler}
        />
      );

      const testUrl = 'https://foo.com/';
      const inputUrlEl = document.getElementById('lecc-cluster-url');

      await user.click(
        screen.getByText(strings.connectionBlock.button.label())
      );
      await user.type(inputUrlEl, testUrl);

      expect(
        screen.getByText(strings.connectionBlock.notice.info())
      ).toBeInTheDocument();
    });
  });

  describe('triggers', () => {
    beforeEach(() => {
      CloudStore.createInstance().loadExtension(extension);
    });

    it('triggers setUrl() handler by changing cluster url input', async () => {
      render(
        <TestConnectionBlockComponent
          loading={false}
          handleClusterConnect={() => {}}
        />
      );

      const testUrl = 'https://foo.com/';
      const inputUrlEl = document.getElementById('lecc-cluster-url');

      await user.type(inputUrlEl, testUrl);

      expect(inputUrlEl.value).toBe(testUrl);
    });

    it('triggers handleClusterConnect handler by clicking on submit button', async () => {
      const handler = jest.fn();

      render(
        <TestConnectionBlockComponent
          loading={false}
          handleClusterConnect={handler}
        />
      );

      await user.click(
        screen.getByText(strings.connectionBlock.button.label())
      );

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('validators', () => {
    let fakeFooBarCloudJson;
    let fakeBarFooCloudJson;

    beforeEach(() => {
      fakeFooBarCloudJson = mkCloudJson({
        __mockStatus: CONNECTION_STATUSES.CONNECTED,
        name: 'foobar',
        cloudUrl: 'http://foobar.com',
        namespaces: [
          {
            cloudUrl: 'https://foobar.com',
            clusterCount: 4,
            credentialCount: 4,
            licenseCount: 1,
            machineCount: 12,
            name: 'foobar namespace',
            proxyCount: 0,
            sshKeyCount: 2,
            synced: true,
          },
        ],
      });

      fakeBarFooCloudJson = mkCloudJson({
        __mockStatus: CONNECTION_STATUSES.CONNECTED,
        name: 'barfoo',
        cloudUrl: 'http://barfoo.com',
        namespaces: [
          {
            cloudUrl: 'https://barfoo.com',
            clusterCount: 4,
            credentialCount: 4,
            licenseCount: 1,
            machineCount: 12,
            name: 'barfoo namespace',
            proxyCount: 0,
            sshKeyCount: 2,
            synced: true,
          },
        ],
      });
    });

    it('shows error message if name is invalid', async () => {
      CloudStore.createInstance().loadExtension(extension);

      render(
        <TestConnectionBlockComponent
          loading={false}
          handleClusterConnect={() => {}}
        />
      );

      const testInvalidName = '...';
      const inputNameEl = document.getElementById('lecc-cluster-name');

      // input should be valid after render
      // error message isn't visible
      expect(
        screen.queryByText(
          strings.connectionBlock.notice.nameSymbolsAreNotValid()
        )
      ).not.toBeInTheDocument();

      await user.type(inputNameEl, testInvalidName);

      inputNameEl.blur();

      // input should be in error state
      // after typing a wrong cloud name
      // error message is visible
      expect(
        screen.getByText(
          strings.connectionBlock.notice.nameSymbolsAreNotValid()
        )
      ).toBeInTheDocument();
    });

    it('shows error message if cloud with incoming name already synced', async () => {
      CloudStore.initStore('cloud-store', {
        clouds: {
          'http://foobar.com': fakeFooBarCloudJson,
        },
      });

      CloudStore.createInstance().loadExtension(extension);

      render(
        <TestConnectionBlockComponent
          loading={false}
          handleClusterConnect={() => {}}
        />
      );

      const testAlreadySyncedName = 'foobar';

      const inputNameEl = document.getElementById('lecc-cluster-name');

      // input should be valid after render
      // error message isn't visible
      expect(
        screen.queryByText(strings.connectionBlock.notice.nameAlreadyUsed())
      ).not.toBeInTheDocument();

      await user.type(inputNameEl, testAlreadySyncedName);

      inputNameEl.blur();

      // input should be in error state
      // after typing a cloud name, which is already synced
      // error message is visible
      expect(
        screen.getByText(strings.connectionBlock.notice.nameAlreadyUsed())
      ).toBeInTheDocument();
    });

    it('shows error message if cloud with incoming url already synced', async () => {
      CloudStore.initStore('cloud-store', {
        clouds: {
          'http://barfoo.com': fakeBarFooCloudJson,
        },
      });

      CloudStore.createInstance().loadExtension(extension);

      render(
        <TestConnectionBlockComponent
          loading={false}
          handleClusterConnect={() => {}}
        />
      );

      const testAlreadySyncedUrl = 'http://barfoo.com';

      const inputUrlEl = document.getElementById('lecc-cluster-url');

      // input should be valid after render
      // error message isn't visible
      expect(
        screen.queryByText(strings.connectionBlock.notice.urlAlreadyUsed())
      ).not.toBeInTheDocument();

      await user.type(inputUrlEl, testAlreadySyncedUrl);

      inputUrlEl.blur();

      // input should be in error state
      // after typing a cloud url, which is already synced
      // error message is visible
      expect(
        screen.getByText(strings.connectionBlock.notice.urlAlreadyUsed())
      ).toBeInTheDocument();
    });
  });
});
