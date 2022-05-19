//
// Generic utilities for tests
//

/* eslint-env browser -- this code is executed in the context of JSDom */

import { act } from '@testing-library/react';

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
