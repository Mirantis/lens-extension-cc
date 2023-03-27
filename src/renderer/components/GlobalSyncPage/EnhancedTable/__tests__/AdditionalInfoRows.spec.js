import { render } from 'testingUtility';
import { AdditionalInfoRows } from '../AdditionalInfoRows';
import { Cloud } from '../../../../../common/Cloud'; // MOCKED

jest.mock('../../../../../common/Cloud');

describe('/renderer/components/EnhancedTable/AdditionalInfoRows', () => {
  let fakeCloud;

  beforeEach(() => {
    fakeCloud = new Cloud({
      name: 'foo',
      cloudUrl: 'http://foo.com',
      namespaces: [
        {
          cloudUrl: 'http://foo.com',
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
    });
  });

  it('renders |without| empty cells', () => {
    render(
      <table>
        <tbody>
          <AdditionalInfoRows namespace={fakeCloud.namespaces[0]} />
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
          <AdditionalInfoRows
            namespace={fakeCloud.namespaces[0]}
            emptyCellsCount={testEmptyCellsCount}
          />
        </tbody>
      </table>
    );

    const emptyTableCells = document.querySelectorAll('td:empty');
    expect(emptyTableCells.length).toBe(listOfInfoCount * testEmptyCellsCount);
  });
});
