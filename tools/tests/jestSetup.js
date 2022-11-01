/* eslint-env jest/globals */

import { matchers as emotionMatchers } from '@emotion/jest';
import { configure } from 'mobx';

// add custom DOM expectations that work well with the Testing Library
//  (just importing is enough)
import '@testing-library/jest-dom/extend-expect';

// add jest-emotion's toHaveStyleRule() matcher
// @see https://github.com/emotion-js/emotion/tree/main/packages/jest#tohavestylerule
expect.extend(emotionMatchers);

configure({
  // necessary in order to use jest.spyOn()
  // @see https://github.com/mobxjs/mobx/issues/2784
  safeDescriptors: false,
});
