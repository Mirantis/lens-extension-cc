//
// Generates a Jest Configuration
//

import path from 'path';
import url from 'url';
import * as rtv from 'rtvjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/**
 * Generates an array of directory globs that are considered for coverage and
 *  unit testing from the repository root. Each directory path must be completed
 *  with either a coverage glob or test match glob pattern to match the intended files.
 * @returns {Array<string>} Base root directory globs. Paths DO NOT start nor end
 *  with a slash.
 */
export const getRootGlobs = function () {
  return ['src'];
};

/**
 * Generates file globs.
 * @param {string} allFilesGlob The glob pattern to match all target files.
 * @param {boolean} [isCoverage] True if the globs are meant for coverage instead
 *  of tests only.
 * @returns {Array<string>} Globs for the current script execution.
 */
export const getFileGlobs = function (allFilesGlob, isCoverage = false) {
  rtv.verify(allFilesGlob, rtv.STRING);

  // NOTE: Jest, in its infinite wisdom (...) decided that it would be good to
  //  require two different glob matching patterns between coverage and unit
  //  test file matches:
  // - For 'collectCoverageFrom', paths are RELATIVE from where Jest is run.
  // - For 'testMatch', paths are ABSOLUTE, unless they begin with a globstar (**).
  const pathPrefix = isCoverage ? '' : `${path.resolve('./')}/`;

  // Currently, jest is always run from the root, so there's no need to distinguish.
  const globs = getRootGlobs().map((pathGlob) => {
    return `${pathPrefix}${pathGlob}/${allFilesGlob}`;
  });

  return globs;
};

/**
 * Generates an array of file globs for use with the 'collectCoverageFrom' configuration,
 *  based on the location from which the script that loaded this module was run.
 * @returns {Array<string>} List of globs relative to the repository's root.
 */
export const getCoverageGlobs = function () {
  // match any file with .js, .jsx, .ts, or .tsx extension
  // NOTE: we ignore .files like .eslintrc.js with `/[^.]` in this glob pattern
  return getFileGlobs('**/[^.]*.[jt]s?(x)', true);
};

/**
 * Generates an array of file globs for use with the 'testMatch' configuration,
 *  based on the location from which the script that loaded this module was run.
 * @returns {Array<string>} List of globs relative to the repository's root.
 */
export const getTestMatchGlobs = function () {
  // match any file with a suffix of .test, or .spec; and with .js,
  //  .jsx, .ts, or .tsx extension; and just test.<ext> or spec.<ext>;
  //  as long as the file is inside a __test__ directory at any depth
  //  within the code base
  return getFileGlobs('**/__tests__/**/?(*.)+(spec|test).[jt]s?(x)');
};

/**
 * @returns {Object} Coverage Thresholds object for maximum thresholds where full
 *  coverage is desired.
 */
export const getFullThresholds = function () {
  // require 100% coverage for everything tested
  return {
    branches: 100,
    functions: 100,
    lines: 100,
    statements: 100,
  };
};

/**
 * @returns {Object} Coverage Thresholds object for relaxed thresholds where full
 *  coverage isn't necessary.
 */
export const getRelaxedThresholds = function () {
  // NOTE: With the coverage threshold config below, Jest will fail if:
  //  - there is less than 85% branch, line, and function coverage, each
  //  - there are more than 10 uncovered statements
  // It may still be possible to have an individual file that is virtually uncovered,
  //  but have strong enough coverage in a bunch of other files to pull the coverage
  //  'up' in order to still achieve the minimum.
  // @see Example configuration and explanation beneath it at
  //  https://jestjs.io/docs/en/configuration#coveragethreshold-object
  return {
    branches: 85,
    functions: 85,
    lines: 85,
    statements: -10,
  };
};

/**
 * Generates a map of coverage globs to thresholds for matching files.
 * @param {Object} [thresholds] Coverage Thresholds object to use to define
 *  coverage minimums.
 * @returns {Object} Map of glob to thresholds, plus an optional 'global' entry
 *  which is the fallback for anything that doesn't match a glob in the map.
 */
export const getCoverageThresholds = function (
  thresholds = getRelaxedThresholds()
) {
  return {
    // NOTE: this object could also contain an entry for a coverage glob (relative glob path)
    //  in order to define different thresholds for it than for everything else that falls
    //  under 'global'
    global: thresholds,
  };
};

/**
 * Generates the basic configuration that all packages, and the
 *  entire repository, should use for Jest.
 * @param {Object} options
 * @param {Array<string>} [options.testMatchGlobs] List of globs for matching test spec files,
 *  to determine which tests to run. Must be __absolute__ glob paths.
 * @param {Array<string>} [options.coverageGlobs] List of globs for matching which files will
 *  be measured for coverage based on tests run per `testMatchGlobs`. Must be __relative__
 *  glob paths.
 * @param {Object} [options.coverageThresholds] Map of coverage glob to associated
 *  coverage thresholds.
 * @returns {{ env: Object, config: Object }} The returned object has an `env`
 *  object with what should be merged into `process.env`, and a `config` object
 *  which is the Jest configuration.
 */
export const baseConfig = function ({
  testMatchGlobs = getTestMatchGlobs(),
  coverageGlobs = getCoverageGlobs(),
  coverageThresholds = getCoverageThresholds(),
} = {}) {
  const ignoredPaths = ['/node_modules/'];

  console.log(
    '🧪 The following TEST MATCH globs will be used to RUN tests:\n%s\n',
    JSON.stringify(testMatchGlobs, undefined, 2)
  );

  if (process.argv.slice(2).includes('--coverage')) {
    console.log(
      '🧪 The following COVERAGE globs will be used to MEASURE coverage:\n%s\n',
      JSON.stringify(coverageGlobs, undefined, 2)
    );
    console.log(
      '🧪 The following COVERAGE thresholds will be required:\n%s\n',
      JSON.stringify(coverageThresholds, undefined, 2)
    );
  }

  return {
    config: {
      automock: false,
      verbose: true,
      collectCoverageFrom: coverageGlobs,
      coverageDirectory: './coverage',
      testEnvironment: '<rootDir>/tools/tests/CustomTestEnvironment.js',
      globals: {
        DEV_ENV: 'true',
        TEST_ENV: 'true',
        FEAT_CLUSTER_PAGE_HEALTH_ENABLED: true,
      },
      transform: {
        '^.+\\.(t|j)sx?$': 'babel-jest',
        '.+\\.(css|styl|less|sass|scss|png|jpg|ttf|woff|woff2|otf)$':
          'jest-transform-stub',
      },
      transformIgnorePatterns: [
        // whitelist specific packages under node_modules (the entirety of which
        //  is ignored by Jest by default) that are shipped as ES6-only and need
        //  to be transpiled via 'babel-jest' configured in the 'transform' option
        // @see https://github.com/facebook/jest/issues/9292#issuecomment-569673251
        'node_modules/(?!(monaco-editor|react-monaco-editor|query-string|filter-obj|decode-uri-component|split-on-first)/)',
      ],
      testMatch: testMatchGlobs,

      // NOTE: to truly ignore paths, we have to ignore them both for tests and
      //  coverage; just ignoring for tests will still result in those paths being
      //  loaded and transpiled for (unnecessary) coverage evaluation
      coveragePathIgnorePatterns: ignoredPaths,
      testPathIgnorePatterns: ignoredPaths,

      moduleDirectories: [
        'node_modules',

        // NOTE: This entry makes it possible for `*.spec.js` files to reference
        //  the `./testingUtility.js` module in this directory __without__
        //  using (potentially very long) relative directory paths, just as
        //  `import { render } from 'testingUtility'` because `__dirname` will
        //  always be the directory where this (testConfig.js) is located.
        // See https://testing-library.com/docs/react-testing-library/setup#configuring-jest-with-test-utils
        //  for the configuration pattern.
        path.resolve(__dirname, '../../tests'),
      ],

      coverageThreshold: coverageThresholds,
      setupFilesAfterEnv: [path.resolve(__dirname, '../../tests/jestSetup.js')],
      snapshotSerializers: ['@emotion/jest/serializer'],
    },
  };
};
