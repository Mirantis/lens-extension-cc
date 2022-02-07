import { get, orderBy } from 'lodash';

export const hocWithTableSorting = (Component) => {
  console.log('Component.props ', Component.props);
  const sortData = (obj, sortBy, order, pathToData) => {
    const sortByValueArr = Object.keys(obj).map((key) => {
      return { [key]: get(obj[key], pathToData[sortBy]) };
    });

    const sorted = orderBy(sortByValueArr, Object.keys(obj), [order]);

    return sorted.map((a) => Object.keys(a));
  };

  return (
    <Component
      {...Component.props}
      sortData={sortData}
    />
  );
}
