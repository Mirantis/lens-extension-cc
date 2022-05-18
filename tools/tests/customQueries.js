//
// Custom queries to customize testingUtility/testing-library
//

import { buildQueries } from '@testing-library/react';

//
// Find all matching elements in the element based on CSS selector
// @see https://devdocs.io/dom/element/queryselectorall
//
// The query is bound to the container in which the UI is rendered:
// ```
// const { queryBySelector } = render(...);
// expect(queryBySelector('...')).toBeInTheDocument();
// ```
//

const [
  queryAllBySelector,
  queryBySelector,
  getAllBySelector,
  getBySelector,
  findAllBySelector,
  findBySelector,
] = (function () {
  const queryAll = (element, selector) => element.querySelectorAll(selector);

  const getMultipleError = (c, selector) =>
    `Found multiple elements with this selector: ${selector}`;
  const getMissingError = (c, selector) =>
    `Unable to find an element with this selector: ${selector}`;

  return [
    queryAll,
    ...buildQueries(queryAll, getMultipleError, getMissingError),
  ];
})();

export {
  queryBySelector,
  queryAllBySelector,
  getBySelector,
  getAllBySelector,
  findAllBySelector,
  findBySelector,
};
