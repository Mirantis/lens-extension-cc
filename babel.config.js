module.exports = {
  presets: [
    // @see https://babeljs.io/docs/en/babel-preset-env#options
    [
      // targets based on https://mirantis.jira.com/wiki/spaces/UIENG/pages/1995703215/Barracuda+Browser+Support+Matrix
      '@babel/preset-env',
      { targets: { electron: '13' } },
    ],

    // what we care from this preset is JSX syntax support with
    //  https://babeljs.io/docs/en/babel-plugin-syntax-jsx
    //  as well as display name support with
    //  https://babeljs.io/docs/en/babel-plugin-transform-react-display-name
    [
      '@babel/preset-react',
      {
        // use new React 16.14.0/17.0.0 JSX runtime
        runtime: 'automatic',
        // support the css prop, @see https://emotion.sh/docs/css-prop#babel-preset
        importSource: '@emotion/react',
      },
    ],
  ],
  plugins: [
    // support css prop, source maps, etc.
    // @see https://emotion.sh/docs/@emotion/babel-plugin#features
    '@emotion/babel-plugin',

    'lodash',

    // @see https://babeljs.io/docs/en/babel-plugin-proposal-decorators.html
    ['@babel/plugin-proposal-decorators', { legacy: true }],

    '@babel/plugin-proposal-class-properties',
  ],
};
