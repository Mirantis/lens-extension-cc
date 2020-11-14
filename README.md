# Mirantis Container Cloud Lens Extension

![CI](https://github.com/Mirantis/lens-extension-cc/workflows/CI/badge.svg?branch=master&event=push)

This [Lens](https://k8slens.dev/) Extension adds a status bar item, and a menu item, that makes it easy to connect Lens to a Mirantis Container Cloud instance and add its clusters to Lens.

## Installation

These instructions will help you install the extension for direct use with Lens. Follow the [development](#development) instructions below if you intend to work on the extension to improve it.

> NPM 7.x is recommended since the `package-lock.json` file uses the v2 format. NPM <= 6 uses the older v1 format.

First, quit Lens if it's currently running, then:

```bash
# download tar file without installing it
$ npm pack @mirantis/lens-extension-cc

# create the directory from which Lens will load the extension on start-up
$ mkdir -p ~/.k8slens/extensions/lens-extension-cc

# extract the contents of the NPM tarball directly into this directory (replace
#  `VERSION` with the actual version in the name of the file previously downloaded)
# NOTE: the '--strip-components=1' part is important to make sure files end-up
#  where they're supposed to
$ tar -xf mirantis-lens-extension-cc-VERSION.tgz \
  -C ~/.k8slens/extensions/lens-extension-cc/ --strip-components=1
```

Start Lens. You should now be able to choose the new `File > Add Cloud Cluster` menu item, or click on the `Add Cloud Cluster` status bar item (far right side of the status bar at the bottom of the app), to get started.

## Upgrade

To upgrade to a newer release, quit Lens, and delete the current extension:

```bash
$ rm -rf ~/.k8slens/extensions/lens-extension-cc
```

Then follow the [installation](#installation) instructions again.

## Development

> NPM 7.x is __required__ since `package-lock.json` uses the v2 format. NPM <= 6 uses the older v1 format.

Rather than cloning the repository into `~/.k8slens/extensions/lens-extension-cc`, clone the repository wherever you prefer to have your code, and then link to it:

```bash
$ git clone https://github.com/Mirantis/lens-extension-cc.git /your/src/path
$ mkdir -p ~/.k8slens/extensions
$ ln -s /your/src/path ~/.k8slens/extensions/lens-extension-cc
$ cd /your/src/path
$ npm install
$ npm start
```

This will put the development build into watch mode.

Restart Lens to load the extension for the first time. Now, as you make source changes, the build will run, and all you need to do is reload the Lens window (`CMD+R` on macOS) to see your changes.

You can also run a one-off development build with `npm run dev`.

## Publishing

First, __update the CHANGELOG__, then:

```bash
$ npm version <patch|minor|major>
$ npm publish --access public        # <- NOTE the '--access public' part!
$ git push && git push --tags
```

> By default, packages published to an NPM scope/org are __private__. Use the `--access public` option to publish it as a public package instead. You can also [configure NPM](https://docs.npmjs.com/configuring-your-npm-client-with-your-organization-settings#setting-package-visibility-to-public-for-a-single-package) to always publish that single package publicly by running `npm config set access public` within the repository root directory (i.e. package root).

The `prepublishOnly` script will automatically produce a production build in the `./dist` directory, which will be published.
