import mockConsole from 'jest-mock-console';
import { render, screen } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { EnhancedTable } from '../EnhancedTable';
import { Cloud } from '../../../../common/__tests__/MockCloud';
import { CloudProvider } from '../../../store/CloudProvider';
import { IpcRenderer } from '../../../IpcRenderer';
import { CloudStore } from '../../../../store/CloudStore';

describe('/renderer/components/EnhancedTable/EnhancedTable', () => {
  const extension = {};
  let fakeCloudFoo;
  let fakeCloudBar;
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    mockConsole(); // automatically restored after each test

    IpcRenderer.createInstance(extension);
    CloudStore.createInstance().loadExtension(extension);

    fakeCloudFoo = new Cloud('http://foo.com', {
      name: 'foo',
      cloudUrl: 'http://foo.com',
      namespaces: [
        {
          cloudUrl: 'https://foo.com',
          clusterCount: 4,
          credentialCount: 4,
          licenseCount: 1,
          machineCount: 12,
          name: 'foo',
          proxyCount: 0,
          sshKeyCount: 2,
          synced: true,
        },
      ],
      syncedNamespaces: [
        {
          cloudUrl: 'https://foo.com',
          clusterCount: 4,
          credentialCount: 4,
          licenseCount: 1,
          machineCount: 12,
          name: 'foo',
          proxyCount: 0,
          sshKeyCount: 2,
          synced: true,
        },
      ],
    });

    fakeCloudBar = new Cloud('http://bar.com', {
      name: 'bar',
      cloudUrl: 'http://bar.com',
      namespaces: [
        {
          cloudUrl: 'https://bar.com',
          clusterCount: 4,
          credentialCount: 4,
          licenseCount: 1,
          machineCount: 12,
          name: 'bar',
          proxyCount: 0,
          sshKeyCount: 2,
          synced: true,
        },
      ],
      syncedNamespaces: [
        {
          cloudUrl: 'https://bar.com',
          clusterCount: 4,
          credentialCount: 4,
          licenseCount: 1,
          machineCount: 12,
          name: 'bar',
          proxyCount: 0,
          sshKeyCount: 2,
          synced: true,
        },
      ],
    });
  });

  [true, false].forEach((isSelectiveSyncView) => {
    it(`|${
      isSelectiveSyncView ? 'does not render' : 'renders'
    }| a table when isSelectiveSyncView is |${isSelectiveSyncView}|`, () => {
      render(
        <CloudProvider>
          <EnhancedTable
            clouds={{ 'foo.com': fakeCloudFoo }}
            isSyncStarted={false}
            isSelectiveSyncView={isSelectiveSyncView}
          />
        </CloudProvider>
      );

      if (!isSelectiveSyncView) {
        expect(document.querySelector('table')).toBeInTheDocument();
      } else {
        expect(document.querySelector('table')).not.toBeInTheDocument();
      }
    });
  });

  it('clicking on table head cell triggers sortBy() handler', async () => {
    render(
      <CloudProvider>
        <EnhancedTable
          clouds={{ 'foo.com': fakeCloudFoo, 'bar.com': fakeCloudBar }}
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
    await user.click(screen.getByText('Name'));

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
    await user.click(screen.getByText('Name'));

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
    await user.click(screen.getByText('Name'));

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
    await user.click(screen.getByText('URL'));

    const firstTimeSortedByUrlCloudsName = [];
    document.querySelectorAll('i[material="chevron_right"]').forEach((icon) => {
      firstTimeSortedByUrlCloudsName.push(
        icon.parentNode.parentNode.textContent
      );
    });
    expect(firstTimeSortedByUrlCloudsName).toEqual(expectedDescCloudsName);
  });
});
