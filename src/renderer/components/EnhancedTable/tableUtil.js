import { get, orderBy } from 'lodash';

const SELECTIVE_HEAD_CELL_VALUES = {
  NAME: 'Name',
  URL: 'URL',
};

const selectivePathToData = {
  [SELECTIVE_HEAD_CELL_VALUES.NAME]: ['cloud', 'name'],
  [SELECTIVE_HEAD_CELL_VALUES.URL]: ['cloud', 'cloudUrl'],
};

const HEAD_CELL_VALUES = {
  NAME: 'Name',
  URL: 'URL',
  USERNAME: 'Username',
  STATUS: 'Status',
};

const pathToData = {
  [HEAD_CELL_VALUES.NAME]: ['cloud', 'name'],
  [HEAD_CELL_VALUES.URL]: ['cloud', 'cloudUrl'],
  [HEAD_CELL_VALUES.USERNAME]: ['cloud', 'username'],
};

export const getTableData = (isSelectiveSyncView) => {
  return isSelectiveSyncView
    ? {
        path: selectivePathToData,
        headCellValue: SELECTIVE_HEAD_CELL_VALUES,
      }
    : {
        path: pathToData,
        headCellValue: HEAD_CELL_VALUES,
      };
};

export const sortData = (obj, sortBy, order, path) => {
  const sortByValueArr = Object.keys(obj).map((key) => {
    return { [key]: get(obj[key], path[sortBy]) };
  });

  const sorted = orderBy(sortByValueArr, Object.keys(obj), [order]);

  return sorted.map((a) => Object.keys(a));
};