const rules = {
  'no-warning-comments': [
    'error',
    {
      terms: ['DEBUG', 'FIXME', 'HACK'],
      location: 'start',
    },
  ],
  quotes: [
    'error',
    'single',
    {
      avoidEscape: true,
      allowTemplateLiterals: false,
    },
  ],
  'no-console': 'error',
  'no-unsafe-optional-chaining': 'error',
  'no-catch-shadow': 'error',
  'no-shadow': 'error',
  'no-unused-vars': [
    'error',
    {
      args: 'none',
      caughtErrors: 'none',
    },
  ],
  'no-use-before-define': 'error',
  'lines-between-class-members': 'error',

  //// jest plugin

  'jest/no-disabled-tests': 'error',
  'jest/no-focused-tests': 'error',
  'jest/no-identical-title': 'error',
  'jest/valid-expect': 'error',
  'jest/valid-title': 'error',

  //// jest-dom plugin

  // this rule is buggy, and doesn't seem to work well with the Testing Library's queries
  'jest-dom/prefer-in-document': 'off',

  //// testing-library plugin

  // this prevents expect(document.querySelector('foo')), which is useful because not
  //  all elements can be found using RTL queries (sticking to RTL queries probably
  //  means less fragile tests, but then there are things we wouldn't be able to
  //  test like whether something renders in Light mode or Dark mode as expected)
  'testing-library/no-node-access': 'off',
  // we use custom queries, which don't get added to `screen` (that's a miss in RTL, IMO),
  //  which means we _must_ destructure the result from `render()` in order to get to
  //  our custom queries
  'testing-library/prefer-screen-queries': 'off',
  // not much value in this one, and it's not sophisticated enough to detect all usage
  //  scenarios so we get false-positives
  'testing-library/await-async-utils': 'off',

  //// react plugin

  // we're using the new JSX transform that doesn't require 'react' import
  'react/jsx-uses-react': 'off',
  'react/react-in-jsx-scope': 'off',
};

const parserOptions = {
  ecmaVersion: 2020, // ES11
  sourceType: 'module',
};

const env = {
  node: true,
  browser: true,
  es2020: true, // enable new ES6-ES11 globals
};

const globals = {
  DEV_ENV: 'readonly',
  TEST_ENV: 'readonly',
  ENTITY_CACHE_VERSION: 'readonly',
  FEAT_CLUSTER_PAGE_HEALTH_ENABLED: 'readonly',
  fetchMock: 'readonly', // from 'jest-fetch-mock' package
};

const baseExtends = [
  'eslint:recommended',
  'prettier', // always AFTER eslint:recommended
  'plugin:jest-dom/recommended',
  'plugin:testing-library/react',
];

const plugins = ['jest'];

module.exports = {
  overrides: [
    {
      // JavaScript files
      files: ['**/*.js', '**/*.mjs'],
      extends: [
        ...baseExtends,
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
      ],
      parser: '@babel/eslint-parser',
      parserOptions: {
        ...parserOptions,
        ecmaFeatures: {
          impliedStrict: true,
          jsx: true,
        },
      },
      globals,
      env,
      plugins,
      rules: {
        ...rules,

        //// React Plugin

        // referring to another component's `.propTypes` is dangerous because that
        //  property doesn't exist in production builds as an optimization
        //  (this rule isn't enabled in 'plugin:react/recommended')
        'react/forbid-foreign-prop-types': 'error',

        //// React-Hooks Plugin

        'react-hooks/exhaustive-deps': 'error', // default is 'warn', we prefer errors (warnings just get ignored)
      },
      settings: {
        //// React Plugin

        // a version needs to be specified, here it's set to detect (default value)
        react: {
          version: 'detect',
        },
      },
    },
    {
      // TypeScript files
      files: ['**/*.ts*'],
      parser: '@typescript-eslint/parser',
      parserOptions,
      extends: [
        ...baseExtends,
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
      ],
      globals,
      env,
      plugins,
      rules: {
        ...rules,
        'no-use-before-define': 'off', // ESLint finds false-positives with React imports in TSX files
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-empty-interface': 'off',
      },
    },
    {
      // test files
      files: ['**/__tests__/**/?(*.)+(spec|test).[jt]s?(x)'],
      env: {
        ...env,
        'jest/globals': true,
      },
      rules: {
        ...rules,
        'react/prop-types': 'off',
      },
    },
    {
      // mock files
      files: ['__mocks__/**/*.[jt]s?(x)'],
      env: {
        ...env,
        'jest/globals': true,
      },
      rules: {
        ...rules,
        'react/prop-types': 'off',
      },
    },
  ],
};
