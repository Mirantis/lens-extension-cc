const commonRules = {
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
};

const commonParserOptions = {
  ecmaVersion: 2018,
  sourceType: 'module',
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
      parser: 'babel-eslint',
      parserOptions: {
        ...commonParserOptions,
        ecmaFeatures: {
          impliedStrict: true,
          jsx: true
        },
      },
      env: {
        node: true,
        browser: true,
      },
      rules: {
        ...commonRules,

        //// React Plugin

        // referring to another component's `.propTypes` is dangerous because that
        //  property doesn't exist in production builds as an optimization
        //  (this rule isn't enabled in 'plugin:react/recommended')
        'react/forbid-foreign-prop-types': 'error',

        //// React-Hooks Plugin

        'react-hooks/exhaustive-deps': 'error' // default is 'warn', we prefer errors (warnings just get ignored)
      },
      settings: {
        //// React Plugin

        // a version needs to be specified, here it's set to detect (default value)
        react: {
          version: 'detect'
        }
      }
    },
    {
      files: ['src/**/*.ts*'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ...commonParserOptions,
      },
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier',
      ],
      env: {
        node: true,
        browser: true,
      },
      rules: {
        ...commonRules,
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
