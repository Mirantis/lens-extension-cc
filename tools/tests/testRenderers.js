//
// All the various renderers for tests
//

/* eslint-env browser -- this code is executed in the context of JSDom */

import propTypes from 'prop-types';
import { render, queries } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import * as customQueries from './customQueries';

const GLOBAL_ERROR_BOUNDARY_TESTID = 'GlobalErrorBoundary';

const childrenPropType = propTypes.oneOfType([
  propTypes.node,
  propTypes.arrayOf(propTypes.node),
]);

// Providers needed to render components
const ComponentProviders = function ({ children }) {
  return (
    <ErrorBoundary testId={GLOBAL_ERROR_BOUNDARY_TESTID}>
      {children}
    </ErrorBoundary>
  );
};

ComponentProviders.propTypes = {
  children: childrenPropType,
};

// Provides a React ErrorBoundary around all rendered children.
const ErrorCatcher = function ({ children }) {
  return (
    <ErrorBoundary testId={GLOBAL_ERROR_BOUNDARY_TESTID}>
      {children}
    </ErrorBoundary>
  );
};

ErrorCatcher.propTypes = {
  children: childrenPropType,
};

// normal render without a custom wrapper, but with all default and custom queries
const renderRaw = (ui, options) =>
  render(ui, {
    queries: { ...queries, ...customQueries },
    ...options,
  });

// component render with the component wrapper and all queries
const renderComponent = (ui, options) =>
  renderRaw(ui, {
    wrapper: ComponentProviders,
    ...options,
  });

// RAW render, but with the error catcher as the wrapper
const renderErrorCatcher = (ui, options) =>
  renderRaw(ui, {
    wrapper: ErrorCatcher,
    ...options,
  });

//
// EXPORTS
//
// NOTE: if a new __render function__ is exported, it should be added to the list
//  of render function names in the root .eslintrc.js file, in the
//  testing-library/no-debug rule configuration
//

export { GLOBAL_ERROR_BOUNDARY_TESTID };

export { renderRaw, renderComponent, renderErrorCatcher };
