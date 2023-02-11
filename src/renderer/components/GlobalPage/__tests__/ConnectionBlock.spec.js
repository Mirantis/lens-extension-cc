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

  const TestConnectionBlockComponent = (props) => {
    return (
      <CloudProvider>
        <ConnectionBlock {...props} />
      </CloudProvider>
    );
  };

  let user;
  let ipcRenderer;

  beforeEach(() => {
    user = userEvent.setup();
    mockConsole(); // automatically restored after each test

    ipcRenderer = IpcRenderer.createInstance(extension);
  });

  describe('renders', () => {
    beforeEach(() => {
      CloudStore.createInstance().loadExtension(extension, { ipcRenderer });
    });

    it('renders connection block', () => {
      render(<TestConnectionBlockComponent loading={false} />);

      expect(
        screen.getByText(strings.connectionBlock.title())
      ).toBeInTheDocument();
    });

    it('does not show info box if not loading and enables all fields', async () => {
      render(<TestConnectionBlockComponent loading={false} />);

      expect(document.querySelector('#cclex-cluster-name')).toBeEnabled();
      expect(document.querySelector('#cclex-cluster-url')).toBeEnabled();
      expect(
        document.querySelector(
          '#cclex-cluster-offlineToken .cclex-tristatecheckbox-field'
        )
      ).toBeEnabled();
      expect(
        screen.getByRole('button', {
          label: strings.connectionBlock.button.label(),
        })
      ).toBeDisabled(); // button disabled because required fields are empty
      expect(
        screen.queryByText(strings.connectionBlock.notice.info())
      ).not.toBeInTheDocument();
    });

    it('does not show info box if loaded and disables button because required fields not filled', async () => {
      render(<TestConnectionBlockComponent loading={false} />);

      expect(document.querySelector('#cclex-cluster-name')).toBeEnabled();
      expect(document.querySelector('#cclex-cluster-url')).toBeEnabled();
      expect(
        document.querySelector(
          '#cclex-cluster-offlineToken .cclex-tristatecheckbox-field'
        )
      ).toBeEnabled();
      expect(
        screen.getByRole('button', {
          label: strings.connectionBlock.button.label(),
        })
      ).toBeDisabled();
      expect(
        screen.queryByText(strings.connectionBlock.notice.info())
      ).not.toBeInTheDocument();
    });

    it('shows info box if loading and disables all fields', async () => {
      render(<TestConnectionBlockComponent loading={true} />);

      expect(document.querySelector('#cclex-cluster-name')).toBeDisabled();
      expect(document.querySelector('#cclex-cluster-url')).toBeDisabled();
      expect(
        document.querySelector(
          '#cclex-cluster-offlineToken .cclex-tristatecheckbox-field'
        )
      ).toBeDisabled();
      expect(
        screen.getByRole('button', {
          label: strings.connectionBlock.button.label(),
        })
      ).toBeDisabled();
      expect(
        screen.getByText(strings.connectionBlock.notice.info())
      ).toBeInTheDocument();
    });

    it('shows info box if not loading but connection error and enables all fields', async () => {
      render(
        <TestConnectionBlockComponent loading={false} connectError="error" />
      );

      expect(document.querySelector('#cclex-cluster-name')).toBeEnabled();
      expect(document.querySelector('#cclex-cluster-url')).toBeEnabled();
      expect(
        document.querySelector(
          '#cclex-cluster-offlineToken .cclex-tristatecheckbox-field'
        )
      ).toBeEnabled();
      expect(
        screen.getByRole('button', {
          label: strings.connectionBlock.button.label(),
        })
      ).toBeDisabled(); // button still disabled because required fields are empty
      expect(
        screen.getByText(strings.connectionBlock.notice.info())
      ).toBeInTheDocument();
    });
  });

  describe('triggers', () => {
    beforeEach(() => {
      CloudStore.createInstance().loadExtension(extension, { ipcRenderer });
    });

    it('triggers setUrl() handler by changing cluster url input', async () => {
      render(<TestConnectionBlockComponent loading={false} />);

      const testUrl = 'https://foo.com/';
      const inputUrlEl = document.getElementById('cclex-cluster-url');

      await user.type(inputUrlEl, testUrl);

      expect(inputUrlEl.value).toBe(testUrl);
    });

    it('triggers onClusterConnect handler by clicking on submit button', async () => {
      const handler = jest.fn();

      render(
        <TestConnectionBlockComponent
          loading={false}
          onClusterConnect={handler}
        />
      );

      // button disabled because required fields are empty
      expect(
        screen.getByRole('button', {
          label: strings.connectionBlock.button.label(),
        })
      ).toBeDisabled();

      const inputNameEl = document.getElementById('cclex-cluster-name');
      const inputUrlEl = document.getElementById('cclex-cluster-url');

      await user.type(inputNameEl, 'foo');
      await user.type(inputUrlEl, 'http://foo.com');

      // button should be enabled now that all required fields are filled
      expect(
        screen.getByRole('button', {
          label: strings.connectionBlock.button.label(),
        })
      ).toBeEnabled();

      await user.click(
        screen.getByRole('button', {
          label: strings.connectionBlock.button.label(),
        })
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
      CloudStore.createInstance().loadExtension(extension, { ipcRenderer });

      render(<TestConnectionBlockComponent loading={false} />);

      const testInvalidName = '...';
      const inputNameEl = document.getElementById('cclex-cluster-name');

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

      CloudStore.createInstance().loadExtension(extension, { ipcRenderer });

      render(<TestConnectionBlockComponent loading={false} />);

      const testAlreadySyncedName = 'foobar';

      const inputNameEl = document.getElementById('cclex-cluster-name');

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

      CloudStore.createInstance().loadExtension(extension, { ipcRenderer });

      render(<TestConnectionBlockComponent loading={false} />);

      const testAlreadySyncedUrl = 'http://barfoo.com';

      const inputUrlEl = document.getElementById('cclex-cluster-url');

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
