//
// Webpack build configuration
//
// Environment Variables:
// - TARGET: Either 'development' or 'production' (default).
//

const path = require('path');
const babelConfig = require('./babel.config');

const loaders = [
  {
    test: /\.m?js$/,
    exclude: /node_modules/,
    use: {
      loader: 'babel-loader',
      options: babelConfig,
    },
  },
  {
    test: /\.tsx?$/,
    use: 'ts-loader',
    exclude: /node_modules/,
  },
];

module.exports = [
  {
    entry: './src/main.ts',
    context: __dirname,
    target: 'electron-main',
    mode: process.env.TARGET || 'production',
    devtool:
      process.env.TARGET !== 'production' ? 'eval-source-map' : undefined,
    module: {
      rules: [...loaders],
    },
    externals: [
      {
        '@k8slens/extensions': 'var global.LensExtensions',
        mobx: 'var global.Mobx',
        react: 'var global.React',
      },
    ],
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
      libraryTarget: 'commonjs2',
      filename: 'main.js',
      path: path.resolve(__dirname, 'dist'),
    },
  },
  {
    entry: './src/renderer.tsx',
    context: __dirname,
    target: 'electron-renderer',
    mode: process.env.TARGET || 'production',
    devtool:
      process.env.TARGET !== 'production' ? 'eval-source-map' : undefined,
    module: {
      rules: [...loaders],
    },
    externals: [
      {
        '@k8slens/extensions': 'var global.LensExtensions',
        mobx: 'var global.Mobx',
        react: 'var global.React',
      },
    ],
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],

      // exclude any 'browser' targets, like node-fetch which will default to
      //  native (browser) fetch and cause CORS issues when connecting with MCC
      mainFields: ['module', 'main'],
    },
    output: {
      libraryTarget: 'commonjs2',
      globalObject: 'this',
      filename: 'renderer.js',
      path: path.resolve(__dirname, 'dist'),
    },
    node: {
      __dirname: false,
      __filename: false,
    },
  },
];
