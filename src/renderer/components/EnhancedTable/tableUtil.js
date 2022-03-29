import { get, orderBy } from 'lodash';

const SELECTIVE_HEAD_CELL_VALUES = {
  NAME: 'NAME',
  AUTOSYNC: 'AUTOSYNC',
  URL: 'URL',
};

const selectivePathToData = {
  [SELECTIVE_HEAD_CELL_VALUES.NAME]: ['cloud', 'name'],
  [SELECTIVE_HEAD_CELL_VALUES.AUTOSYNC]: ['cloud', 'syncAll'],
  [SELECTIVE_HEAD_CELL_VALUES.URL]: ['cloud', 'cloudUrl'],
};

const HEAD_CELL_VALUES = {
  NAME: 'NAME',
  URL: 'URL',
  USERNAME: 'USERNAME',
  STATUS: 'STATUS',
};

const pathToData = {
  [HEAD_CELL_VALUES.NAME]: ['cloud', 'name'],
  [HEAD_CELL_VALUES.URL]: ['cloud', 'cloudUrl'],
  [HEAD_CELL_VALUES.USERNAME]: ['cloud', 'username'],
  [HEAD_CELL_VALUES.STATUS]: ['cloud', 'status'],
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
