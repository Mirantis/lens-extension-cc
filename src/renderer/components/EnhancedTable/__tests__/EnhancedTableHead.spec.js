import { render, screen } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { EnhancedTableHead } from '../EnhancedTableHead';
import { getTableData } from '../tableUtil';
import { managementClusters } from '../../../../strings';

describe('/renderer/components/EnhancedTable/EnhancedTableHead', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  [true, false].forEach((isSelectiveSync) => {
    const { headCellValue } = getTableData(isSelectiveSync);
    const testSortedBy = headCellValue.NAME;

    const headerCells = Object.keys(headCellValue).map((key) => ({
      label: managementClusters.table.thead[key.toLowerCase()](),
      key,
    }));

    it(`render ${isSelectiveSync ? '|Selective Sync|' : ''} table head`, () => {
      render(
        <table>
          <EnhancedTableHead
            sortBy={() => {}}
            sortedBy={testSortedBy}
            order="desc"
            headerValues={headCellValue}
          />
        </table>
      );

      const buttons = screen.getAllByRole('button');

      buttons.forEach((button, index) => {
        expect(button).toHaveTextContent(headerCells[index].label);
        expect(
          button.querySelector('i[material="arrow_drop_down"]')
        ).toBeInTheDocument();
      });
    });

    it(`clicking on sort button in ${
      isSelectiveSync ? '|Selective Sync|' : ''
    } table head triggers sortBy handler`, async () => {
      const handler = jest.fn();
      render(
        <table>
          <EnhancedTableHead
            sortBy={handler}
            sortedBy={testSortedBy}
            order="asc"
            headerValues={headCellValue}
          />
        </table>
      );

      const buttons = screen.getAllByRole('button');

      buttons.forEach(async (button) => {
        await user.click(button);
        expect(handler).toHaveBeenCalled();
      });
    });
  });
});
