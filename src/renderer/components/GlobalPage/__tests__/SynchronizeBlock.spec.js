import mockConsole from 'jest-mock-console';
import { render, screen } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { SynchronizeBlock } from '../SynchronizeBlock';
import { Cloud } from '../../../../common/Cloud'; // MOCKED
import { CloudProvider } from '../../../store/CloudProvider';
import { IpcRenderer } from '../../../IpcRenderer';
import { CloudStore } from '../../../../store/CloudStore';
import * as strings from '../../../../strings';

jest.mock('../../../../common/Cloud');

describe('/renderer/components/GlobalPage/AddCloudInstance', () => {
  const extension = {};
  let user;
  let fakeCloud;
  let fakeCloudWithoutNamespaces;
  let dataCloud;
  let dataCloudWithoutNamespaces;

  beforeEach(() => {
    user = userEvent.setup();
    mockConsole(); // automatically restored after each test

    IpcRenderer.createInstance(extension);

    fakeCloud = new Cloud({
      name: 'bar',
      cloudUrl: 'http://bar.com',
      namespaces: [
        {
          cloudUrl: 'https://bar.com',
          clusterCount: 4,
          credentialCount: 4,
          licenseCount: 1,
          machineCount: 12,
          name: 'namespace 1',
          proxyCount: 0,
          sshKeyCount: 2,
          synced: false,
        },
        {
          cloudUrl: 'https://bar.com',
          clusterCount: 4,
          credentialCount: 4,
          licenseCount: 1,
          machineCount: 12,
          name: 'namespace 2',
          proxyCount: 0,
          sshKeyCount: 2,
          synced: false,
        },
      ],
    });

    fakeCloudWithoutNamespaces = new Cloud({
      name: 'bar',
      cloudUrl: 'http://bar.com',
      namespaces: [],
    });

    dataCloud = {
      cloud: fakeCloud,
      error: null,
      fetching: false,
      loaded: true,
      namespaces: [
        {
          cloud: fakeCloud,
          clusterCount: 4,
          credentialCount: 4,
          licenseCount: 1,
          machineCount: 12,
          name: 'namespace 1',
          proxyCount: 0,
          sshKeyCount: 2,
        },
        {
          cloud: fakeCloud,
          clusterCount: 4,
          credentialCount: 4,
          licenseCount: 1,
          machineCount: 12,
          name: 'namespace 2',
          proxyCount: 0,
          sshKeyCount: 2,
        },
      ],
    };

    dataCloudWithoutNamespaces = {
      cloud: fakeCloudWithoutNamespaces,
      error: null,
      fetching: false,
      loaded: true,
      namespaces: [],
    };

    CloudStore.createInstance().loadExtension(extension);
  });

  it('renders component', () => {
    render(
      <CloudProvider>
        <SynchronizeBlock dataCloud={dataCloud} onAdd={() => {}} />
      </CloudProvider>
    );

    expect(
      screen.getByText(strings.synchronizeBlock.title())
    ).toBeInTheDocument();
  });

  it('shows no project found message if dataCloud has no namespaces', () => {
    render(
      <CloudProvider>
        <SynchronizeBlock
          dataCloud={dataCloudWithoutNamespaces}
          onAdd={() => {}}
        />
      </CloudProvider>
    );

    expect(
      screen.getByText(strings.synchronizeBlock.noProjectsFound())
    ).toBeInTheDocument();
  });

  it('select all projects by checking "check all" checkbox', async () => {
    render(
      <CloudProvider>
        <SynchronizeBlock dataCloud={dataCloud} onAdd={() => {}} />
      </CloudProvider>
    );

    const projectCheckboxes = document.querySelectorAll(
      'ul input[type="checkbox"]'
    );

    projectCheckboxes.forEach((checkbox) => {
      expect(checkbox).not.toBeChecked(); // not checked by default
    });

    await user.click(
      screen.getByText(strings.synchronizeBlock.checkAllCheckboxLabel())
    );

    projectCheckboxes.forEach((checkbox) => {
      expect(checkbox).toBeChecked(); // checked after checking "check all" checkbox
    });
  });

  it('show warning by checking "Synchronize future projects" checkbox', async () => {
    render(
      <CloudProvider>
        <SynchronizeBlock dataCloud={dataCloud} onAdd={() => {}} />
      </CloudProvider>
    );

    expect(
      screen.queryByText(strings.synchronizeBlock.warning())
    ).not.toBeInTheDocument(); // not visible by default

    await user.click(
      screen.getByText(strings.synchronizeBlock.synchronizeFutureProjects())
    );

    expect(
      screen.getByText(strings.synchronizeBlock.warning())
    ).toBeInTheDocument(); // visible after checking "Synchronize future projects" checkbox
  });

  it('sort projects by clicking sort button', async () => {
    render(
      <CloudProvider>
        <SynchronizeBlock dataCloud={dataCloud} onAdd={() => {}} />
      </CloudProvider>
    );

    const expectedAscProjectsName = ['namespace 1', 'namespace 2'];
    const expectedDescProjectsName = ['namespace 2', 'namespace 1'];
    const expectedDefaultProjectsName = expectedAscProjectsName;

    // Projects should be ordered by default (first render)
    const firstRenderProjectsName = [];
    document
      .querySelectorAll('ul input[type="checkbox"]')
      .forEach((checkbox) => {
        firstRenderProjectsName.push(checkbox.parentNode.textContent);
      });

    expect(firstRenderProjectsName).toEqual(expectedDefaultProjectsName);

    // Projects should be ordered by |asc|
    await user.click(document.querySelector('i[material="arrow_drop_up"]'));

    const firstTimeSortedProjectsName = [];
    document
      .querySelectorAll('ul input[type="checkbox"]')
      .forEach((checkbox) => {
        firstTimeSortedProjectsName.push(checkbox.parentNode.textContent);
      });

    expect(firstTimeSortedProjectsName).toEqual(expectedAscProjectsName);

    // Projects should be ordered by |desc|
    await user.click(document.querySelector('i[material="arrow_drop_up"]'));

    const secondTimeSortedProjectsName = [];
    document
      .querySelectorAll('ul input[type="checkbox"]')
      .forEach((checkbox) => {
        secondTimeSortedProjectsName.push(checkbox.parentNode.textContent);
      });

    expect(secondTimeSortedProjectsName).toEqual(expectedDescProjectsName);
  });
});
