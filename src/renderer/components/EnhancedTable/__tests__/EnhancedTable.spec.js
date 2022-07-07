import { render, screen } from 'testingUtility';
import { EnhancedTable } from '../EnhancedTable';
import { Cloud } from '../../../../common/__mocks__/Cloud';
import { CloudProvider } from '../../../store/CloudProvider';
import { IpcRenderer } from '../../../IpcRenderer';

describe('/renderer/components/EnhancedRable/EnhancedTable', () => {
  let fakeCloud;

  beforeEach(() => {
    IpcRenderer.createInstance({});

    fakeCloud = new Cloud('http://foo.com', {
      name: 'foo',
      cloudUrl: 'http://foo.com',
      namespaces: [
        {
          cloudUrl: 'https://foo.com',
          clusterCount: 4,
          credentialCount: 4,
          licenseCount: 1,
          machineCount: 12,
          name: 'default',
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
          name: 'default',
          proxyCount: 0,
          sshKeyCount: 2,
          synced: true,
        },
      ],
    })
  });

  it('renders', () => {
    console.log(fakeCloud);
    render(
      <CloudProvider>
        <EnhancedTable clouds={{ 'foo.com': fakeCloud }} isSyncStarted={false} />
      </CloudProvider>
    );
  });
});
