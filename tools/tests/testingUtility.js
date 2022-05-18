//
// Use this module INSTEAD OF '@testing-library/react' since it re-exports
//  everything from the Testing Library, but provides an augmented render()
//  which wraps the 'ui' being tested into required providers. See `moduleDirectories`
//  in /tools/scripts/test/testConfigs.mjs for the configuration.
//

/* eslint-env browser -- this code is executed in the context of JSDom */

import { screen, within } from '@testing-library/react';
import { renderComponent } from './testRenderers';
import * as customQueries from './customQueries';

// this allows us to add our custom queries to the `screen` object, which binds
//  all available queries to the document; taken from
//  https://github.com/testing-library/dom-testing-library/issues/516#issuecomment-606813576
const getBoundQueries = function (el) {
  return Object.entries(customQueries).reduce((obj, [queryName, queryFn]) => {
    obj[queryName] = queryFn.bind(null, el);
    return obj;
  }, {});
};

// our own version of `screen` to provide our additional custom queries
// @see https://testing-library.com/docs/queries/about#screen
const customScreen = { ...screen, ...getBoundQueries(document.body) };

// our own version of `within` to provide our additional custom queries
// @see https://testing-library.com/docs/dom-testing-library/api-within
const customWithin = function (el) {
  const result = within(el);
  const boundQueries = getBoundQueries(el);
  return { ...result, ...boundQueries };
};

//
// EXPORTS
//

// re-export everything
// eslint-disable-next-line no-duplicate-imports
export * from '@testing-library/react';

// override @testing-library/react's render() method exported above
export { renderComponent as render };

export { customScreen as screen };
export { customWithin as within };

export * from './testRenderers';
export * from './testTools';
