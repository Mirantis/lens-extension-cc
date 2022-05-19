/* eslint-env jest/globals */

import { matchers as emotionMatchers } from '@emotion/jest';
import { enableMocks as enableFetchMocks } from 'jest-fetch-mock';
import { configure } from 'mobx';

// add custom DOM expectations that work well with the Testing Library
//  (just importing is enough)
import '@testing-library/jest-dom/extend-expect';

// add jest-emotion's toHaveStyleRule() matcher
// @see https://github.com/emotion-js/emotion/tree/main/packages/jest#tohavestylerule
expect.extend(emotionMatchers);

enableFetchMocks();

// we just want things like the Request class to be defined in Jest env
// enable fetch mocks in individual tests with fetchMock.doMock()
// @see https://www.npmjs.com/package/jest-fetch-mock#default-not-mocked
fetchMock.dontMock();

configure({
  // necessary in order to use jest.spyOn()
  // @see https://github.com/mobxjs/mobx/issues/2784
  safeDescriptors: false,
});
