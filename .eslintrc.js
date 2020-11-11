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
};

const parserOptions = {
  ecmaVersion: 2018,
  sourceType: 'module',
};

const env = {
  node: true,
  browser: true,
  es2017: true, // NOTE: 'es2018' (to match parser) is not valid; next is 'es2020'
};

const globals = {
  DEV_ENV: 'readonly',
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
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier',
      ],
      globals,
      env,
      rules: {
        ...rules,
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
