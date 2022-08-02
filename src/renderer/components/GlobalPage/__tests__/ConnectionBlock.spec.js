import mockConsole from 'jest-mock-console';
import { render, screen, sleep, fireEvent } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { ConnectionBlock } from '../ConnectionBlock';
import {
  Cloud,
  mkCloudJson,
  CONNECTION_STATUSES,
} from '../../../../common/Cloud'; // MOCKED
import { CloudProvider, useClouds } from '../../../store/CloudProvider';
import { IpcRenderer } from '../../../IpcRenderer';
import { CloudStore } from '../../../../store/CloudStore';
import * as strings from '../../../../strings';

jest.mock('../../../../common/Cloud');

describe('/renderer/components/GlobalPage/ConnectionBlock', () => {
  const extension = {};
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    // mockConsole(); // automatically restored after each test

    IpcRenderer.createInstance(extension);
    CloudStore.createInstance().loadExtension(extension);
  });

  it('renders connection block', () => {

    render(
      <CloudProvider>
        <ConnectionBlock loading={false} handleClusterConnect={() => {}} />
      </CloudProvider>
    );

    expect(screen.getByText(strings.connectionBlock.title())).toBeInTheDocument();
  });

  it('triggers setUrl() handler by changing cluster url input', async () => {

    render(
      <CloudProvider>
        <ConnectionBlock loading={false} handleClusterConnect={() => {}} />
      </CloudProvider>
    );

    const inputUrl = document.getElementById('lecc-cluster-url');

    await user.type(inputUrl, 'https://foo.com/');

    expect(inputUrl.value).toBeTruthy();
  });

  it('clicking on submit button triggers handleClusterConnect handler', async () => {

    const handler = jest.fn();

    render(
      <CloudProvider>
        <ConnectionBlock loading={false} handleClusterConnect={handler} />
      </CloudProvider>
    );

    await user.click(screen.getByText(strings.connectionBlock.button.label()));

    expect(handler).toHaveBeenCalled();
  });
});
