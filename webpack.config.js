//
// Webpack build configuration
//
// Environment Variables:
// - TARGET: Either 'development' or 'production' (default).
// - DEV_UNSAFE_NO_CERT: Set to 'thisisunsafe' to disable TLS certificate verification
//     on MCC instances.
// - FEAT_CLUSTER_PAGE_ENABLED: Set to 1 to enable the Cluster Page feature. Disabled by default.
// - ENTITY_CACHE_VERSION: Version to use when caching entities via the SyncManager to disk with the
//     SyncStore. Changing this version will result in a forced update of all synced resources
//     the next time a DataCloud connects and syncs from MCC. Defaults to the
//     `package.json:version` plus a unique value. It essentially cache-busts out of the
//     `resourceVersion` check which would otherwise (if unchanged; and some entities rarely change,
//     including clusters) result in entities in the SyncStore being skipped from updates. If we
//     introduce a new feature that requires additional data in each entity, and the `resourceVersion`
//     hasn't changed, the user won't get the new data until that `resourceVersion` changes (if ever).
//

const path = require('path');
const { DefinePlugin } = require('webpack');
const babelConfig = require('./babel.config');
const pkg = require('./package.json');

const buildTarget = process.env.TARGET || 'production';

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

const plugins = [
  new DefinePlugin({
    DEV_ENV: JSON.stringify(buildTarget !== 'production'),
    TEST_ENV: JSON.stringify(false), // always false (Jest configures it true always for tests)
    ENTITY_CACHE_VERSION:
      process.env.ENTITY_CACHE_VERSION ||
      JSON.stringify(`v${pkg.version}@${Date.now()}`),
    DEV_UNSAFE_NO_CERT: JSON.stringify(
      buildTarget !== 'production' &&
        process.env.DEV_UNSAFE_NO_CERT === 'thisisunsafe'
    ),
    FEAT_CLUSTER_PAGE_ENABLED: JSON.stringify(
      !!Number(process.env.FEAT_CLUSTER_PAGE_ENABLED)
    ),
    'process.env.TARGET': JSON.stringify(buildTarget),
  }),
];

module.exports = [
  {
    entry: './src/main/main.ts',
    context: __dirname,
    target: 'electron-main',
    mode: buildTarget,
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
    plugins,
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
    entry: './src/renderer/renderer.tsx',
    context: __dirname,
    target: 'electron-renderer',
    mode: buildTarget,
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
    plugins,
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
