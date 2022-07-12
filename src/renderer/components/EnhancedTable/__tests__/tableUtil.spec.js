import * as tableUtil from '../tableUtil';

describe('/renderer/components/EnhancedTable/tableUtil', () => {
  describe('getTableData()', () => {
    [true, false].forEach((isSelectiveSyncView) => {
      it(`uses |${
        isSelectiveSyncView
          ? tableUtil.SELECTIVE_HEAD_CELL_VALUES
          : tableUtil.HEAD_CELL_VALUES
      }| as the head cell value when isSelectiveSyncView is |${isSelectiveSyncView}|`, () => {
        if (isSelectiveSyncView) {
          expect(tableUtil.getTableData(isSelectiveSyncView)).toMatchObject({
            path: tableUtil.selectivePathToData,
            headCellValue: tableUtil.SELECTIVE_HEAD_CELL_VALUES,
          });
        } else {
          expect(tableUtil.getTableData(isSelectiveSyncView)).toMatchObject({
            path: tableUtil.pathToData,
            headCellValue: tableUtil.HEAD_CELL_VALUES,
          });
        }
      });
    });
  });

  describe('sortData()', () => {
    const fakeClouds = {
      'http://foo.com': {
        name: 'foo',
      },
      'http://bar.com': {
        name: 'bar',
      },
    };

    it('returns sorted object keys array when order is |asc|', () => {
      expect(
        tableUtil.sortData(
          fakeClouds,
          tableUtil.HEAD_CELL_VALUES.NAME,
          'asc',
          tableUtil.selectivePathToData
        )
      ).toEqual([['http://foo.com'], ['http://bar.com']]);
    });

    it('returns sorted object keys array when order is |desc|', () => {
      expect(
        tableUtil.sortData(
          fakeClouds,
          tableUtil.HEAD_CELL_VALUES.NAME,
          'desc',
          tableUtil.selectivePathToData
        )
      ).toEqual([['http://bar.com'], ['http://foo.com']]);
    });
  });

  describe('sortNamespaces()', () => {
    const compareNamespaces = (first, second) => {
      if (first.name === 'default') {
        return -1;
      }
      if (second.name === 'default') {
        return 1;
      }
      return first.name.localeCompare(second.name);
    };

    const testNamespacesWithoutDefault = [
      {
        name: 'test 1',
      },
      {
        name: 'test 2',
      },
    ];

    const testNamespacesWithFirstDefault = [
      {
        name: 'default',
      },
      {
        name: 'test 2',
      },
    ];

    const testNamespacesWithDefault = [
      {
        name: 'test 1',
      },
      {
        name: 'default',
      },
    ];

    it('returns an initial object, if there is no "default" name or "default" is first', () => {
      expect(
        tableUtil.sortNamespaces(testNamespacesWithoutDefault)
      ).toMatchObject(testNamespacesWithoutDefault.sort(compareNamespaces));
      expect(
        tableUtil.sortNamespaces(testNamespacesWithFirstDefault)
      ).toMatchObject(testNamespacesWithFirstDefault.sort(compareNamespaces));
    });

    it('returns a sorted object, if there is "default" name and it isn`t first', () => {
      expect(tableUtil.sortNamespaces(testNamespacesWithDefault)).toMatchObject(
        testNamespacesWithDefault.sort(compareNamespaces)
      );
    });
  });
});
