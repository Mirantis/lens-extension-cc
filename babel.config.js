module.exports = {
  presets: [
    // @see https://babeljs.io/docs/en/babel-preset-env#options
    [
      // targets based on https://mirantis.jira.com/wiki/spaces/UIENG/pages/1995703215/Barracuda+Browser+Support+Matrix
      '@babel/preset-env',
      { targets: { electron: '9' } },
    ],

    // NOTE: any options related to `babel-plugin-transform-react-jsx` set here
    //  will be OVERRIDDEN by similar options set on `@emotion/babel-preset-css-prop`
    //  below since both presets import the same plugin
    // what we care from this preset is JSX syntax support with
    //  https://babeljs.io/docs/en/babel-plugin-syntax-jsx
    //  as well as display name support with
    //  https://babeljs.io/docs/en/babel-plugin-transform-react-display-name
    '@babel/preset-react',

    // NOTE: with this preset, the babel-plugin-emotion is NOT needed because
    //  the preset _includes_ the plugin
    // NOTE: this preset includes the @babel/plugin-transform-react-jsx plugin
    //  and takes all of its config as options also (therefore, only this
    //  preset is necessary, and options for this plugin must be specified here
    //  instead of directly on that plugin)
    // NOTE: this preset must come AFTER @babel/preset-react (so that it takes precedence)
    // NOTE: this preset sets the `pragma` option of the `babel-plugin-transform-react-jsx`
    //  plugin to `'__EmotionJSX'`
    //  (see https://github.com/emotion-js/emotion/blob/master/packages/babel-preset-css-prop/src/index.js#L5)
    //  and also automatically adds the necessary `import` statement to all JS
    //  modules that use JSX syntax
    // @see https://emotion.sh/docs/@emotion/babel-preset-css-prop
    // @see https://babeljs.io/docs/en/babel-plugin-transform-react-jsx
    '@emotion/babel-preset-css-prop',
  ],
  plugins: [
    'lodash',

    // @see https://babeljs.io/docs/en/babel-plugin-proposal-decorators.html
    // NOTE: must come BEFORE class-properties
    ['@babel/plugin-proposal-decorators', { legacy: true }],

    // @see https://babeljs.io/docs/en/babel-plugin-proposal-class-properties.html
    // NOTE: must use `loose` because of proposal-decorators legacy flag
    ['@babel/plugin-proposal-class-properties', { loose: true }],
  ],
};
