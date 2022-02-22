import { get, orderBy } from 'lodash';

const SELECTIVE_HEAD_CELL_VALUES = {
  NAME: 'Name',
  AUTOSYNC: 'Autosync',
  URL: 'URL',
};

const selectivePathToData = {
  [SELECTIVE_HEAD_CELL_VALUES.NAME]: ['cloud', 'name'],
  [SELECTIVE_HEAD_CELL_VALUES.AUTOSYNC]: ['cloud', 'syncAll'],
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

  return sorted.map(Object.keys);
};

const compareNamespaces = (first, second) => {
  const nameA = first.name.toUpperCase();
  const nameB = second.name.toUpperCase();
  // sort namespaces alphabetically based on name,
  // with the exception of always putting the "default" namespace at the top of the list.
  if (nameA.includes('DEFAULT')) {
    return -1;
  }
  if (nameB.includes('DEFAULT')) {
    return 1;
  }
  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }

  return 0;
};

export const sortNamespaces = (namespaces) =>
  namespaces.sort(compareNamespaces);
