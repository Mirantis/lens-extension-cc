import { get, orderBy } from 'lodash';

export const SELECTIVE_HEAD_CELL_VALUES = {
  NAME: 'NAME',
  AUTOSYNC: 'AUTOSYNC',
  URL: 'URL',
};

export const selectivePathToData = {
  [SELECTIVE_HEAD_CELL_VALUES.NAME]: ['name'],
  [SELECTIVE_HEAD_CELL_VALUES.AUTOSYNC]: ['syncAll'],
  [SELECTIVE_HEAD_CELL_VALUES.URL]: ['cloudUrl'],
};

export const HEAD_CELL_VALUES = {
  NAME: 'NAME',
  URL: 'URL',
  USERNAME: 'USERNAME',
  STATUS: 'STATUS',
};

export const pathToData = {
  [HEAD_CELL_VALUES.NAME]: ['name'],
  [HEAD_CELL_VALUES.URL]: ['cloudUrl'],
  [HEAD_CELL_VALUES.USERNAME]: ['username'],
  [HEAD_CELL_VALUES.STATUS]: ['status'],
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
  return sorted.map(Object.keys);
};

const compareNamespaces = (first, second) => {
  if (first.name === 'default') {
    return -1;
  }
  if (second.name === 'default') {
    return 1;
  }
  return first.name.localeCompare(second.name);
};

export const sortNamespaces = (namespaces) =>
  namespaces.sort(compareNamespaces);
