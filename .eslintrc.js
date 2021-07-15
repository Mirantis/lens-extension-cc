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
      caughtErrors: 'none'
    }
  ],
  'no-use-before-define': 'error',

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
  DEV_UNSAFE_NO_CERT: 'readonly',
};

module.exports = {
  overrides: [
    {
      files: ['**/*.js'],
      extends: [
        'eslint:recommended',
        'prettier', // always AFTER eslint:recommended
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
      files: ['src/**/*.ts*'],
      parser: '@typescript-eslint/parser',
      parserOptions,
      extends: [
        'eslint:recommended',
        'prettier', // always AFTER eslint:recommended
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
      ],
      globals,
      env,
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
  ],
};
