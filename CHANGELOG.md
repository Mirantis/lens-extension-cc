# ChangeLog

## v3.1.0

### Minor

- Added ability to open clusters from the MCC browser UI using kubeconfig context name so that even clusters added by downloading the kubeconfig from MCC and pasting into Lens can be opened from the browser by choosing the "Open in Lens" feature.
    - This change is backward-compatible with older versions of MCC that still only send the cluster UID to Lens to use for finding a cluster and opening it. For these versions of MCC, manually-added clusters will not be found (as before). Only clusters added via the extension (whether by choosing "Add to Lens" in MCC, or by loading the extension and selecting a cluster from the list) will be found by cluster UID.

## v3.0.4

### Patch

- Updated @k8slens/extensions dependency to v5.3.0
- Updated the Container Cloud icon to have a thicker/bolder appearance, which is better balanced with Material icons used by Lens.

## v3.0.3

### Changed

- Fixed: The "Settings" item in the Catalog's cluster context menu was not appearing in the toolbar when selecting the cluster.

## v3.0.2

### Added

- Fixed: There was no "Settings" item in the Catalog's cluster context menu to allow editing settings of clusters added by this extension.

## v3.0.1

### Changed

- Updated `@k8slens/extensions` dependency from 5.0.2 to 5.1.0.

## v3.0.0

This is the official release. __Requires Lens 5.1.0 or later.__

### Changed

- Updated the `lens` engine compatibility to `^5.0.0`.
    - Technically, it should be `^5.1.0` but, because of [this Lens issue](https://github.com/lensapp/lens/issues/3404), it had to be kept to `^5.0.0` even though the extension will not function properly in `< 5.1.0`.
- Fixed a bug where the size of the cluster store (where the extension stores cluster models so they can be restored to the Catalog on restart) was doubling with duplicate models on every restart.

## v3.0.0-beta.1

Supports Lens `>= 5.0.0`.

### Added

- Clusters are now added to the new Lens Catalog. Each cluster is given `mcc=true` and `project=NAMESPACE` labels.
- Clusters added by this extension have new Remove and Delete context menu options in the Catalog:
    - Remove: Removes the cluster while leaving the kubeConfig file on disk in the location configured in the extension's Preferences.
    - Delete: Removes the cluster and deletes the kubeConfig file.
- When adding clusters the normal way (not via a protocol request from the Mirantis Container Cloud UI), the extension automatically switches the view to the Catalog after adding clusters to show the new clusters available in Lens.

### Changed

- 🚨 __BREAKING:__ Lens `5.0.0` or later is required to run this extension. It is not backward-compatible with a previous version of Lens. To use this extension with a version of Lens prior to `5.0.0`, install an older version of this extension in Lens.
- 🚨 __BREAKING:__ Mirantis Container Cloud instances using basic authentication are no longer supported. Your instance must now use Keycloak SSO authentication in order to use this extension.
    - Keycloak-based authentication/authorization is much more secure than basic username/password authentication. Consider migrating your Container Cloud instance to it if you haven't already.
- The [/addClusters](#protocol---add-multiple-clusters) protocol API no longer supports the `keycloakLogin` option. SSO is now assumed/expected.
- Clusters in the "default" namespace are no longer selected by default when available clusters are listed, since we assume that any clusters in that namespace are likely management- or regional-type clusters that are of less interest to introspect in Lens. They can still be added; they simply won't be selected by default.
- Clusters that are already in Lens (in the Catalog) are now disabled in the list of clusters (with an "(in Lens)" label next to them) and cannot be added again.
- Docs: Removed an unnecessary [Keycloak configuration](README.md#keycloak-configuration) requirement for permitting requests from `"*"` origin. That is not needed, and can remain as the default `"+"` setting (which means "allow requests from any configured `redirect_uri` origins).

## v2.2.1

Supports Lens `>= 4.2.4`.

### Changed

- Updated installation instructions now that Lens 4.2.4 has fixed issues with extension installation for extensions hosted on NPM, as well as for installations triggered via the `lens:` protocol ([#239](https://github.com/Mirantis/lens-extension-cc/issues/239))

## v2.2.0

Supports Lens `>= 4.2`.

### Added

- SSO support ([#12](https://github.com/Mirantis/lens-extension-cc/issues/12)):
    - This adds many UI changes, and makes it possible to connect to Mirantis Container Cloud instances that use Keycloak OAuth (SSO) for access control. Previously, only instances that used basic authentication were supported.
    - Notice the new Access button under the "Instance URL" field. Click this button after entering the URL to have the extension detect whether it supports SSO or basic auth. If it's basic auth, you'll get username and password fields as before. If it's [SSO](README.md#sso-support), your default system browser will open so that you can authorize the extension with your SSO account. Use the new Cancel button (in the extension) if something goes wrong during this process.
    - When accessing an SSO-enabled instance, only one cluster may be added at a time. This is a [known limitation](README.md#single-cluster-limitation).
    - When adding a cluster, your default system browser will open again (because the cluster uses a different Keycloak client than the one used to list the clusters), and you will have another Cancel button (in the extension) in case something goes wrong during this process.

### Changed

- Fixed: Emotion styles generated by this extension were conflicting with Emotion styles generated by Lens ([#205](https://github.com/Mirantis/lens-extension-cc/pull/205))
- Fixed: Offline token option should default to false ([#217](https://github.com/Mirantis/lens-extension-cc/issues/217))
- Fixed: There's no way to re-enter the password during an "Add clusters to Lens" event ([#215](https://github.com/Mirantis/lens-extension-cc/issues/215))
- Fixed: Added cluster would not always activate properly via [protocol handler](README.md#supported-protocol-requests) ([#26](https://github.com/Mirantis/lens-extension-cc/issues/26))
- Removed feature gate for adding [protocol handlers](README.md#supported-protocol-requests), which means this extension now requires Lens `>=` 4.2 ([#25](https://github.com/Mirantis/lens-extension-cc/issues/25))

## v2.1.2

### Changed

- Fixed: When adding only one cluster, that being the Management Cluster, and this resulting in the creation of a new `mcc_default` workspace, the extension would crash because it failed to find the ID of the new workspace to activate.
- Added namespace/name detail of cluster in console error if we fail to parse data for any discovered cluster(s) to make it easier to identify which cluster the extension can't load.
- Fixed: Clusters that aren't ready (i.e. still being provisioned), which means a kubeConfig can't be generated for them yet, are now gracefully handled instead of resulting in a handled exception output to the console. They will still show-up in the list of clusters to add, but will now be disabled/un-selectable and will have a "(not ready)" label associated with them.
- Fixed: Clusters being deleted will no longer show-up in the list of clusters to add.

## v2.1.1

### Changed

- Updated protocol handler configuration based on API changes on [Lens#1949](https://github.com/lensapp/lens/pull/1949).
- Fixed a potential exception when the extension attempts to add its item to the stats bar.
- Fixed a bug where the Mirantis Container Cloud username was not being restored from stored preferences after restarting Lens.

## v2.1.0

Supports Lens `>= 4.0.8`.

### Changed

- The default save path for kubeConfig files is now a Lens-generated, extension-specific data directory that will survive even if the extension is uninstalled. This means any kubeConfig files saved to the default directory will not also be deleted, effectively/unintentionally removing those clusters from Lens.
    - __NOTE about previous versions:__ If you are using the default directory from a previous version, we highly recommend you relocate any kubeConfig files it contains to a new directory of your choice, and update the directory in the extension's preferences to also be a directory of your choice, other than the current setting. Note that relocating the kubeConfig files will mean that the associated clusters will need to be re-added manually in Lens. (Another option would be to remove the clusters in Lens, update the directory, and then re-add them to Lens using the extension.)
- Preferences are now stored on disk rather than in `localStorage` inside the browser instance that runs the extension inside Lens. This is great, because it means preferences truly persist to disk and will no longer get reset whenever you upgrade Lens (you may never even have noticed, which makes this bug fix even more significant)!
    - Trivia: `localStorage` was from a long ago port from the very first implementation of this extension which had its beginnings as a `create-react-app` running the browser before the Lens Extension API was even published (just to get a head start on all the UI views without any real functionality behind them).

## v2.0.3

Supports Lens `>= 4.0.6`.

### Changed

- A few strings have been updated to meet branding requirements.

## v2.0.2

### Changed

- Management clusters are no longer selected by default after retrieving clusters from an Mirantis Container Cloud instance. They are typically of less interest. They can still be selected and added along with any other cluster, however.
- Some notification messages have been shortened to make them quicker to read.
- Made the cluster deserialization process more resilient (fixes [#35](https://github.com/Mirantis/lens-extension-cc/issues/35)).
- Made the namespace deserialization process more resilient (similar to [#35](https://github.com/Mirantis/lens-extension-cc/issues/35)).

## v2.0.1

### Changed

- When adding multiple clusters from multiple namespaces into new Lens Workspaces, the extension now prefers activating the first-found Workspace that is _not_ associated with the `default` namespace since it typically only contains the Mirantis Container Cloud management cluster, which is of less interest than clusters in other namespaces. If selected, the management cluster is still added, however, and can be activated in Lens like any other cluster.

## v2.0.0

Supports Lens `>= 4.0.2`.

This is a rollup of all `2.0.0-alpha.X` and `2.0.0-beta.X` changes, however, the protocol request-related features are now behind a small feature gate awaiting official [support](https://github.com/lensapp/lens/issues/1288) in Lens.

For now, the extension continues to operate as it did before, with the changes noted below.

### Added

- New Preferences Panel, which moves the preferences out of the main extension body and into the side panel.
- Current extension version is now displayed in the bottom/right corner of the Help panel.

### Changed

- When adding clusters, kubeConfig files will not be generated for clusters which are already in Lens.
- The "save location" field is now read-only. You must use the folder picker to choose an existing folder.
- A notification is now posted listing all new clusters added to Lens.
- Removed the '1-2-3' sequence on the main headings since not all steps are always visible depending on whether the extension is being used normally, or as a result of clicking on a `lens://` link.
- The status bar item is now only the icon without the label. The label is now displayed as a tooltip on hover.
- The `@k8slens/extensions` dependency has been updated to `4.0.2`.

## v2.0.0-beta.1

- Previous release was built while Webpack DevServer was running, so the output of the published files in `./dist` is questionable. This release has no changes, but it was built the right way, just to be sure.

## v2.0.0-beta.0

### Added

- Current extension version is now displayed in the bottom/right corner of the Help panel.

### Changed

- Fixed bug where 'add clusters' protocol action would show loader when actually adding clusters, rather than just when loading clusters.
- Removed test 'EVENT' status bar item.

## v2.0.0-alpha.2

### Added

- Another protocol integration: Ability to open an already added Mirantis Container Cloud cluster in Lens.

### Changed

- Removed the '1-2-3' sequence on the main headings since not all steps are always visible depending on whether the extension is being used normally, or as a result of clicking on a `lens://` link.

## v2.0.0-alpha.1

### Changed

- Fixed: Protocol request handlers are now removed when the extension is deactivated.

## v2.0.0-alpha.0

### Added

- New Preferences Panel, which moves the preferences out of the main extension body and into the side panel.
- New `lens://` protocol integrations (requires code on Lens [hackweek-protocol-handler](https://github.com/lensapp/lens/tree/hackweek-protocol-handler) branch to work with Lens):
    - Add clusters directly from Mirantis Container Cloud in the browser as kubeConfigs.
    - Add selected clusters from Mirantis Container Cloud in the browser. This requires providing your password prior to adding the clusters you select (because each cluster gets its own kubeConfig file, and each one needs its own cluster access-specific token), but no longer requires you to copy/paste the Mirantis Container Cloud instance URL into the extension and signing in that way.

### Changed

- When adding clusters, kubeConfig files will not be generated for clusters which are already in Lens.
- The "save location" field is now read-only. You must use the folder picker to choose an existing folder.
- A notification is now posted listing all new clusters added to Lens.

## v1.0.5

Update for Lens `4.0.0` official release.

## v1.0.4

### Changed

- Adjusted the padding on the status bar item so it isn't so squished in the right corner or against other status bar extension items.
- Adjusted the color of the status bar item to always be white regardless of the theme (which fixes an issue where it was a dark color when switching to the LIGHT theme).
- Now relying on Lens to provide styling for custom scrollbars (see [lens#1484](https://github.com/lensapp/lens/pull/1484)).

## v1.0.3

Update for Lens `4.0.0-rc.1`.

### Changed

- Removed deprecated (and now removed) global page `addRoute` property.

## v1.0.2

This release contains no code changes.

### Added

- Missing standard package.json metadata
- Screen shot to README

## v1.0.1

This release contains no code changes.

### Added

- NPM-based installation instructions to the README

## v1.0.0

### Added

- Initial release! 🎉
