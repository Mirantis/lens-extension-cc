# Mirantis Container Cloud Lens Extension

![CI](https://github.com/Mirantis/lens-extension-cc/workflows/CI/badge.svg?branch=master&event=push)

This [Lens](https://k8slens.dev/) Extension adds a status bar item, and a menu item, that makes it easy to connect Lens to a Mirantis Container Cloud instance and add its clusters to Lens.

![Extension UI](./docs/screen-shot.png)

## Installing

These instructions will help you install the extension for direct use with Lens. Follow the [development](#development) instructions below if you intend to work on the extension to improve it.

> NPM 6 or later is required to use the [npm pack](https://docs.npmjs.com/cli/v6/commands/npm-pack) command.

Until [this Lens issue](https://github.com/lensapp/lens/issues/1708) is fixed, the extension's tarball (a compressed `.tgz` file) must first be downloaded to your local system:

```bash
# download tar file without installing it
$ npm pack @mirantis/lens-extension-cc
```

This will download a file named like `mirantis-lens-extension-cc-X.Y.Z.tgz` to the current directory.

Start Lens and go to the Extensions View (`CMD+SHIFT+E` on macOS). Use the file picker to find the tarball you just downloaded. This will install and enable the extension in Lens.

You should now be able to choose the new `File > Add Cloud Clusters` menu item, or click on the `Mirantis Container Cloud` status bar icon (far right side of the status bar at the bottom of the app), to get started.

## Upgrading

To upgrade to a newer release, go to the Extensions View (`CMD+SHIFT+E` on macOS), uninstall the extension, and then [re-install](#installing) it again.

## Development

> __Yarn 1.x is required__

First, quit Lens if it's currently running.

Then, clone the repository wherever you prefer to have your code, and then link to it:

```bash
$ git clone https://github.com/Mirantis/lens-extension-cc.git /your/src/path
$ mkdir -p ~/.k8slens/extensions
$ ln -s /your/src/path ~/.k8slens/extensions/lens-extension-cc
$ cd /your/src/path
$ yarn       # install dependencies
$ yarn start # start dev build in watch mode
```

This will put the development build into watch mode.

Restart Lens and go to the Extensions View (`CMD+SHIFT+E` on macOS) to enable it, which will cause it to load for the first time.

Now, as you make source changes, the build will run, and all you need to do is __reload the Lens window__ (`CMD+R` on macOS) to see your changes.

You can also run a one-off development build with `yarn dev`.

> Note these steps will get much easier once [this Lens issue](https://github.com/lensapp/lens/issues/1741) is fixed.

## Uninstalling

Go to the Lens Extensions View (`CMD+SHIFT+E` on macOS) and use the UI to uninstall it.

If you followed the [development](#development) instructions, this will just remove the symlink you created in `~/.k8slens/extensions` and leave your linked directory intact.

## Publishing

First, __update the CHANGELOG__, then __use NPM__:

```bash
$ npm version <patch|minor|major>
$ npm publish --access public        # <- NOTE the '--access public' part!
$ git push && git push --tags
```

> By default, packages published to an NPM scope/org are __private__. Use the `--access public` option to publish it as a public package instead. You can also [configure NPM](https://docs.npmjs.com/configuring-your-npm-client-with-your-organization-settings#setting-package-visibility-to-public-for-a-single-package) to always publish that single package publicly by running `npm config set access public` within the repository root directory (i.e. package root).

The `prepublishOnly` script will automatically produce a production build in the `./dist` directory, which will be published.

## Help

### SSO not supported

MCC instances that use third-party SSO authentication (e.g. Google OAuth) are __not supported__ at this time. We plan on adding support [soon](https://github.com/Mirantis/lens-extension-cc/issues/12).

### Management clusters not selected by default

The extension purposely doesn't not add management clusters to the default/initial set of selected clusters after retrieving clusters from an MCC instance because they are typically of less interest than workload clusters.
