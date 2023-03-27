import mockConsole from 'jest-mock-console';
import { render, screen, act } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { EnhancedTable } from '../EnhancedTable';
import { Cloud } from '../../../../../common/Cloud'; // MOCKED
import { CloudProvider } from '../../../../store/CloudProvider';
import { IpcRenderer } from '../../../../IpcRenderer';
import { CloudStore } from '../../../../../store/CloudStore';

jest.mock('../../../../../common/Cloud');

describe('/renderer/components/GlobalSyncPage/EnhancedTable/EnhancedTable', () => {
  const extension = {};
  let fakeCloudFoo;
  let fakeCloudBar;
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    mockConsole(['log', 'info', 'warn']); // automatically restored after each test

    fakeCloudFoo = new Cloud({
      cloudUrl: 'http://foo.com',
      name: 'foo',
      namespaces: [
        {
          cloudUrl: 'https://foo.com',
          clusterCount: 4,
          credentialCount: 4,
          licenseCount: 1,
          machineCount: 12,
          name: 'foo namespace',
          proxyCount: 0,
          sshKeyCount: 2,
          synced: true,
        },
      ],
    });

    fakeCloudBar = new Cloud({
      cloudUrl: 'http://bar.com',
      name: 'bar',
      namespaces: [
        {
          cloudUrl: 'https://bar.com',
          clusterCount: 4,
          credentialCount: 4,
          licenseCount: 1,
          machineCount: 12,
          name: 'bar namespace',
          proxyCount: 0,
          sshKeyCount: 2,
          synced: true,
        },
      ],
    });

    const ipcRenderer = IpcRenderer.createInstance(extension);
    CloudStore.createInstance().loadExtension(extension, { ipcRenderer });
  });

  [true, false].forEach((isSelectiveSyncView) => {
    it(`renders a table when isSelectiveSyncView is |${isSelectiveSyncView}|`, () => {
      render(
        <CloudProvider>
          <EnhancedTable
            clouds={{ 'http://foo.com': fakeCloudFoo }}
            isSyncStarted={false}
            isSelectiveSyncView={isSelectiveSyncView}
          />
        </CloudProvider>
      );

      expect(document.querySelector('table')).toBeInTheDocument();
    });
  });

  it('clicking on table head cell triggers sortBy() handler', async () => {
    render(
      <CloudProvider>
        <EnhancedTable
          clouds={{
            'http://foo.com': fakeCloudFoo,
            'https://bar.com': fakeCloudBar,
          }}
          isSyncStarted={false}
        />
      </CloudProvider>
    );

    const expectedAscCloudsName = ['bar', 'foo'];
    const expectedDescCloudsName = ['foo', 'bar'];
    const expectedDefaultCloudsName = expectedDescCloudsName;

    // Clouds should be ordered by default (first render)
    const firstRenderCloudsName = [];
    document.querySelectorAll('i[material="chevron_right"]').forEach((icon) => {
      firstRenderCloudsName.push(icon.parentNode.parentNode.textContent);
    });
    expect(firstRenderCloudsName).toEqual(expectedDefaultCloudsName);

    // Clouds should be ordered by |asc|
    // after first clicking on header cell,
    // which is equal to current sortedBy (Name by default)
    await act(async () => await user.click(screen.getByText('Name')));

    const firstTimeSortedByNameCloudsName = [];
    document.querySelectorAll('i[material="chevron_right"]').forEach((icon) => {
      firstTimeSortedByNameCloudsName.push(
        icon.parentNode.parentNode.textContent
      );
    });
    expect(firstTimeSortedByNameCloudsName).toEqual(expectedAscCloudsName);

    // Clouds should be ordered by |desc|
    // after second clicking on header cell,
    // which is equal to current sortedBy
    await act(async () => await user.click(screen.getByText('Name')));

    const secondTimeSortedByNameCloudsName = [];
    document.querySelectorAll('i[material="chevron_right"]').forEach((icon) => {
      secondTimeSortedByNameCloudsName.push(
        icon.parentNode.parentNode.textContent
      );
    });
    expect(secondTimeSortedByNameCloudsName).toEqual(expectedDescCloudsName);

    // Clouds should be ordered by |asc|
    // after third clicking on header cell,
    // which is equal to current sortedBy
    await act(async () => await user.click(screen.getByText('Name')));

    const thirdTimeSortedByNameCloudsName = [];
    document.querySelectorAll('i[material="chevron_right"]').forEach((icon) => {
      thirdTimeSortedByNameCloudsName.push(
        icon.parentNode.parentNode.textContent
      );
    });
    expect(thirdTimeSortedByNameCloudsName).toEqual(expectedAscCloudsName);

    // Clouds should be ordered by |desc|
    // after clicking on header cell,
    // which is not equal to current sortedBy
    await act(async () => await user.click(screen.getByText('URL')));

    const firstTimeSortedByUrlCloudsName = [];
    document.querySelectorAll('i[material="chevron_right"]').forEach((icon) => {
      firstTimeSortedByUrlCloudsName.push(
        icon.parentNode.parentNode.textContent
      );
    });
    expect(firstTimeSortedByUrlCloudsName).toEqual(expectedDescCloudsName);
  });
});
