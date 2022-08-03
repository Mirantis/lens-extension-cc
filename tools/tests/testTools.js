//
// Generic utilities for tests
//

/* eslint-env browser -- this code is executed in the context of JSDom */

import { act } from '@testing-library/react';
import mockConsole from 'jest-mock-console';
import { GLOBAL_ERROR_BOUNDARY_TESTID, renderComponent } from './testRenderers';

/**
 * Sleep a given number of milliseconds during a test. This is useful when you're
 *  trying to assert that something will not happen after a given duration, like
 *  a Popup will not appear when clicked because it's in HOVER mode.
 *
 * The RTL `waitFor()` function is not a suitable substitute because it runs
 *  immediately, and continues to run for a set time period, until an assertion
 *  is satisfied. What sleep() does is pause/wait for some time, afterwhich
 *  you can make an assertion that something isn't there.
 *
 * @param {number} duration Milliseconds.
 * @see https://github.com/testing-library/dom-testing-library/issues/699
 */
export const sleep = async function (duration = 0) {
  // NOTE: act() by itself is typically synchronous, but if you make an async
  //  call in the handler function you give it, you'll get the promise back
  //  and you should await, hence what we're doing here
  await act(() => new Promise((resolve) => setTimeout(resolve, duration)));
};

/**
 * Renders the component, expecting it to throw an error, which will be caught
 *  by the ErrorBoundary. The error's text is then matched to `text`.
 *
 * The console is temporarily mocked so as to avoid React printing the error
 *  content to the screen while running the test.
 *
 * @param {React.Component} component Component to render.
 * @param {string|RegExp} text Text to match.
 * @param {Object} [options]
 * @param {Function} [options.renderer] Render function, e.g. `render`, `renderRaw`,
 *  `renderLightTheme`, etc., to use to render the `component` to HTML.
 */
export const expectErrorBoundary = function (
  component,
  text,
  { renderer = renderComponent } = {}
) {
  // even though we're rendering with an ErrorBoundary instance, React will still
  //  print the error to the console, so we need to eliminate the expected noise
  const restoreConsole = mockConsole(['log', 'info', 'warn']);

  const { queryByTestId } = renderer(component);
  expect(queryByTestId(GLOBAL_ERROR_BOUNDARY_TESTID)).toHaveTextContent(text);

  restoreConsole();
};

/**
 * Checks the given object to see if it looks like a DOMEvent object.
 * @param {Object} event
 */
export const expectEventObject = function (event) {
  expect(event).toBeTruthy();
  expect(typeof event.preventDefault).toBe('function'); // looks like an Event
};
