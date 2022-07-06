import { render } from 'testingUtility';
import { AdditionalInfoRows } from '../AdditionalInfoRows';
import { makeFakeCloud } from '../../../../__tests__/cloudTestUtil';

describe('/renderer/components/EnhancedRable/AdditionalInfoRows', () => {
  let fakeCloud;

  beforeEach(() => {
    fakeCloud = {
      'http://foo.com': makeFakeCloud({
        name: 'foo',
        cloudUrl: 'http://foo.com',
        namespaces: [
          {
            cloudUrl: 'https://container-cloud.int.mirantis.com',
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
      }),
    };
  });

  it('renders |without| empty cells', () => {
    render(
      <table>
        <tbody>
          <tr>
            <AdditionalInfoRows
              namespace={fakeCloud['http://foo.com'].namespaces[0]}
            />
          </tr>
        </tbody>
      </table>
    );

    const emptyTableCells = document.querySelectorAll('td:empty');
    expect(emptyTableCells.length).toBe(0);
  });

  it('renders |with| empty cells', () => {
    const listOfInfoCount = 5;
    const testEmptyCellsCount = 2;

    render(
      <table>
        <tbody>
          <tr>
            <AdditionalInfoRows
              namespace={fakeCloud['http://foo.com'].namespaces[0]}
              emptyCellsCount={testEmptyCellsCount}
            />
          </tr>
        </tbody>
      </table>
    );

    const emptyTableCells = document.querySelectorAll('td:empty');
    expect(emptyTableCells.length).toBe(listOfInfoCount * testEmptyCellsCount);
  });
});
