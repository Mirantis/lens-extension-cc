# Mirantis Container Cloud Extension

This Lens Extension adds a status bar item, and a menu item, that makes it easy to connect Lens to a Mirantis Container Cloud instance and add its clusters to Lens.

## Install

```bash
$ mkdir -p ~/.k8slens/extensions/lens-extension-cc
$ git clone https://github.com/Mirantis/lens-extension-cc.git ~/.k8slens/extensions/lens-extension-cc
$ cd ~/.k8slens/extensions/lens-extension-cc
$ npm install
$ npm run build
```

Then, restart Lens. You should now be able to choose the new `File > Add Cloud Cluster` menu item, or click on the `Add Cloud Cluster` status bar item (far right side of the status bar at the bottom of the app), to get started.

## Development

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

```bash
$ npm version <patch|minor|major>
$ npm publish
```

The `prepublishOnly` script will automatically produce a production build in the `./dist` directory, which will be published.
