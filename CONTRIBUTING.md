# Contributing

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

Now, as you make source changes, the build will run, and __usually__ all you need to do is __reload the Lens window__ (`CMD+R` on macOS) to see your changes. If you make changes under `/src/main` (or any shared code that's used by that code), however, you will need to __restart Lens__ because code on the main thread does not get reloaded with `CMD+R`.

You can also run a one-off development build with `yarn dev`.

> Note these steps will get much easier once [this Lens issue](https://github.com/lensapp/lens/issues/1741) is fixed.

### Dev - Env vars

The following environment variables are supported when starting Lens from the command line (typically to debug the `main` process):

- `LEX_CC_MAIN_CAPTURE`: Use this to opt-out of broadcasting some log messages from `main` to `renderer` to reduce noise in the `renderer` process' DevTools Console.
    - No value, or one of "true", "yes", or "1" will enable it.
    - Set it to any other non-empty value to disable it.

Start Lens from the command line, with `main` process debugging enabled, like this (and here, we're disabling the flag, as an example of using it):

```bash
$ DEBUG=true LEX_CC_MAIN_CAPTURE=0 /Applications/Lens.app/Contents/MacOS/Lens --inspect=5858
```

### Dev - Uninstalling

Go to the Lens Extensions View (`CMD+SHIFT+E` on macOS) and use the UI to uninstall it.

This will simply remove the symlink [you created](#development) in `~/.k8slens/extensions` and leave your linked directory intact.

## Publishing

First, __update the CHANGELOG__:

- Make sure everything in __UNRELEASED__ is accurate
- Change `UNRELEASED -> vX.Y.Z` (version that will be published)

Then __use NPM__:

```bash
$ npm version <patch|minor|major>
$ npm publish --access public        # <- NOTE the '--access public' part!
$ git push && git push --tags
```

> By default, packages published to an NPM scope/org are __private__. Use the `--access public` option to publish it as a public package instead. You can also [configure NPM](https://docs.npmjs.com/configuring-your-npm-client-with-your-organization-settings#setting-package-visibility-to-public-for-a-single-package) to always publish that single package publicly by running `npm config set access public` within the repository root directory (i.e. package root).

The `prepublishOnly` script will automatically produce a production build in the `./dist` directory, which will be published.
