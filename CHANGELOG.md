# ChangeLog

## UNRELEASED

- Updated `kubelogin` binary dependency from [v1.26.0 to v1.27.0](https://github.com/int128/kubelogin/compare/v1.26.0...v1.27.0).

## v5.6.0

- Added new __History__ [cluster page](README.md#cluster-pages), showing cluster- and machine-related deployment and upgrade history.
    - Requires MCC v2.22+, otherwise the History tab won't be available.

## v5.5.0

- Added new __offline token__ management cluster option: When selected, cluster access tokens (generated by Lens when opening synced clusters) will be long-lived instead of short-lived.
    - ❗️ This works around a [Lens issue](https://github.com/lensapp/lens/issues/6966) whereby dozens/hundreds of login windows can be opened in the default browser if Lens is left running in the background and the short-lived cluster access token expires.
    - See the [docs](README.md#offline-tokens) for more info.
- Added new __trust host__ management cluster option: When selected, TLS verification __will be skipped__ when connecting with the host, as well as when connecting with any cluster synced through this management cluster.
    - See the [docs](README.md#trusted-hosts) for more info.
- Improved how connection errors are displayed when adding a new management cluster, or when reconnecting to a disconnected management cluster:
    - When adding, error messages are displayed in an error popup notification which does not auto-dismiss.
    - When syncing, error messages are surfaced in an error icon next to the status string in the Sync View table. Mouse over for a tooltip containing the error message.
    - Error messages are introspected for two specific cases in order to provide more helpful messages: Untrusted self-signed certificates, and unable to reach the host.
- Removed the `LEX_CC_UNSAFE_ALLOW_SELFSIGNED_CERTS` Lens startup command line option in favor of the new per-management cluster __trust host__ feature.
    - 💬 To help users migrate to the new per-management cluster setting, away from the command line, if the flag is set and at least one untrusted management cluster with a secure connection (`https`) is being synced, a temporary "Configure trusted hosts" dialog will appear the first time the SyncView is rendered. This dialog will give the user a chance to trust selected hosts if necessary. Hosts with connection errors will have an error icon with a tooltip announcing the error (helpful to see if it needs to be trusted because of certificate issues).
- Added keyboard support (i.e. for tab key) to custom tri-state checkbox component used throughout the extension.
- Restricted the management cluster URL to `http` or `https` protocols when adding new management clusters since that's what we expect for MCC instances.

## v5.4.0

- Updated `kubelogin` binary dependency from [v1.25.3 to v1.26.0](https://github.com/int128/kubelogin/compare/v1.25.3...v1.26.0).
- All generated cluster kubeconfigs now configure the `kubelogin` token cache directory to be inside the data directory generated by Lens for use by this extension, to prevent conflicts with another version of `kubelogin` that might be installed on the user's system.
- When a cluster resource is updated, a new kubeconfig file is generated for it (whereas in the past, only the cluster's Lens entity would be updated, keeping the original kubeconfig when the cluster was first synced into to Lens).
- Relax the notion of a cluster's "config-ready" state (state in which a kubeconfig can be successfully generated for it), increasing the likelyhood that it won't be ignored during sync.
- Fix incorrect cluster region displayed in detail views, particularly for AWS clusters.
    - Instead of seeing "aws" as the region, it should now show something like "us-west-2".
- Fix how cluster label values are listed in the `Cluster page > MCC > Overview` panel.
    - Some contain lists of referenced objects like credentials and SSH keys, and these lists are now pretty-printed with spaces.

## v5.3.0

- __New MCC cluster pages__: When opening an MCC cluster synced via this extension, a series of new [cluster pages](./README.md#cluster-pages) are available in the Lens sidenav providing MCC-specific details about the cluster.
- Fixed styling of "Selective sync" button in light theme by giving it a consistent new secondary button style.

## v5.2.2

- When setting the Management Cluster URL in the "Add Management Cluster" view, only the necessary portion of the URL will be used in order to establish the sync.
  - For example, if the user provides a URL to a child cluster, like `https://mcc.com/projects/my-project/clusters/my-cluster`, instead of the management cluster, only the origin, `https://mcc.com` in this case, will be used in order to help them be more successful when using the extension since the marketing term "management cluster" is somewhat confusing.
- Fixed missing "Namespace" in each entity details view in the Catalog.
- Fixed a bug where Catalog Entities wouldn't get updated with new data needed for new features until (if ever) the related API resource would get updated in MCC.
    - From now on, whenever a new extension version is released, fresh data for all synced entities will be fetched the first time the extension runs in Lens.
- Fixed a bug in mgmt cluster connection status reporting where status feedback was not as immediate as it should have been.
- Fixed top bar item layout that [broke](https://github.com/lensapp/lens/issues/6658) in Lens version `2022.11.251411-latest`

## v5.2.1

- Show `--` instead of the URL if StackLight is disabled and URLs aren’t available in Cluster details view.
- Fixed bug where BYO Credentials were not listed in the Catalog.

## v5.2.0

- Changed timestamp format in `Created at` and `Synced at` fields in all the "View details" entity panels.
- Updated Mirantis Container Cloud icon.
- Fixed bug where setting the [LEX_CC_UNSAFE_ALLOW_SELFSIGNED_CERTS](./README.md#self-signed-certificates) flag on the command line was not reflected in generated cluster kubeConfig files.

## v5.1.0

- Added new `Synced at` field in all the "View details" entity panels showing the last time at which the entity was synced from MCC.
    - Note the timestamp will read `<Unknown>` for any entities that were synced using a previous version until they change in MCC and get updated in Lens during a subsequent sync.

## v5.0.2

- Updated [kubelogin](https://github.com/int128/kubelogin/releases) binary from v1.25.1 to v1.25.3

## v5.0.1

- Fixed bug with sorting items in the Sync View.
- Added friendly error handlers for protocol requests that are no longer supported, but may still come when people are using a version of MCC older than 2.19:
    - `/kubeConfig` (i.e. "Add cluster to Lens" in older MCC cluster context menus)
    - `/addClusters`

## v5.0.0

- 🚨 __BREAKING:__ Make the extension compatible with Lens 6 while unintentionally/forcibly dropping support for Lens 5.
    - The Lens Extensions API does not allow an extension to support multiple major versions of Lens, even if it would work on an API level.
    - You can use `v4.0.0` with Lens 5 by installing it with `@mirantis/lens-extension-cc@4.0.0` in the Extensions View in Lens, but __we will no longer be supporting it__. Bug fixes and new features will only be added to our new `v5.0.0` release going forward.

## v4.0.0

🚨 __BREAKING:__ This is a major release that incorporates all the changes listed in previous __alpha__ and __beta__ pre-releases as detailed in this log.

The main highlights are:

- New Sync Manager replaces manual "select and add" functionality.
- 🚨 Any clusters added using previous versions (v3 and older) will be dropped from Lens upon installing v4.
    - There is (unfortunately) no migration path.
    - Take note of your clusters, particularly which management clusters and projects they belonged to, and then sync them.
- Main view is changed to the "Sync overview" where you can see what projects from what management clusters you're syncing.
- Sync is done on a project level within a given management cluster.
    - Multiple management clusters/projects can be synced at once.
    - Adding, modifying, removing resources in MCC will automatically be reflected in Lens via sync.
- All items (clusters, SSH keys, proxies, licenses, credentials) from a project are synced and added to the Lens Catalog.
- MCC items in the Catalog have customized details panels which show metadata about each resource (as you would see in the MCC browser UI).
- The [kubelogin](https://github.com/int128/kubelogin) binary is now packaged with the extension and used to obtain SSO access tokens post-sync, at the moment when a synced cluster is opened in Lens.

## v4.0.0-beta.1

⚠️ This is an early release build and may still have some bugs.

- The `kubelogin` license is now included alongside the binaries.
- The Mirantis Kubernetes Engine dashboard URL is now included (and clickable) in the cluster details panel (choose "View details" from the cluster's context menu).
- The Mirantis StackLight URLs are now included (and clickable) in the cluster details panel, if StackLight is enabled on the cluster.
- Added detection for power suspend/resume and network offline/online events to auto-stop/resume sync operations.
- Leveraged new [Minimum Viable Value](https://gitlab.com/stefcameron/rtvjs#minimum-viable-values) feature in RTV.js to reduce memory use.
- Tested the extension against a number of corner case sync scenarios to improve quality.

## v4.0.0-beta.0

⚠️ This is an early release build and is not fully tested.

- Resources contained in projects are no longer displayed when adding a new management cluster, as well as in the Selective Sync view for any in un-synced projects.
- Added synced proxy and license counts for synced projects in the Sync View.
- Added warning about potential sync and management cluster performance when the number of synced projects exceeds (or may exceed through "future sync") 10 or more (per management cluster). This is an API limitation, not an extension limitation.
- Fixed issue with "select all" checkboxes sometimes being out-of-sync with child states.
- Fixed issue with "select all" checkboxes going from partial to unchecked instead of checked.
- The `kubelogin` binary is now being packaged with the extension to remove the need for users to download and install it separately.
    - The extension will support macOS x64/arm64, Linux x64, and Windows x64 (the platforms which Lens supports).
- Fixed issue where terminated (but not yet completely deleted) projects would remain listed as either synced or syncable.

## v4.0.0-alpha.4

⚠️ This is an early alpha build and is not fully functional/tested.

- Updated dependencies for [Lens 5.4.5](https://github.com/lensapp/lens/releases/tag/v5.4.5)
    - The extension __crashes__ in Lens v5.4.4 because of a Lens bug fixed in v5.4.5.
- Catalog syncing is now enabled! The fake Catalog items have been removed, and you should now see any cluster, credential, SSH key, proxy, and RHEL license in any of the projects you're syncing show-up in the Catalog.
- The [kubelogin](https://github.com/int128/kubelogin) binary __must be installed separately__ in order to open synced clusters.
- The old status bar item has been replaced by a new top bar item to make it easier to find, and easier to click on.
- It's now possible to connect to a management cluster using a self-signed certificate. See the [Security](README.md#security) section in the README for more information.
- Sorting bugs in the SyncView have been fixed.

## v4.0.0-alpha.3

⚠️ This is an early alpha build and is not fully functional/tested.

- For real, this time, fix the fake Catalog items not showing up.
- Add additional custom details to the "Details panel" (choose `View details` from a Catalog item's context menu) for Proxies, SSH Keys, Credentials, and Licenses. Clusters aren't supported yet.

## v4.0.0-alpha.2

⚠️ This is an early alpha build and is not fully functional/tested.

- Updated dependencies for [Lens 5.4](https://github.com/lensapp/lens/releases/tag/v5.4.0) official release.
- Fixed fake Catalog items not showing up.

## v4.0.0-alpha.1

⚠️ This is an early alpha build and is not fully functional/tested.

- Added __Selective Sync__ mode. Use the aptly-named button at the top/right of the Extension's main view to adjust your project selections across all synced management clusters at once.
- No syncing actually takes place yet, but project selections across all management clusters are stored on disk and restored after quitting and re-opening Lens.
- Selective Sync mode work whether the management cluster is connected or not. When disconnected, only known projects can be de/selected.
- When adding a new management cluster, or updating sync selections in _Selective Sync_ mode, a new __Sync future projects__ option is available.
    - This determines if any newly-discovered projects are automatically added to your sync selection for that management cluster, or ignored.
- It's now possible to reconnect a _disconnected_ management cluster.
    - If you quit Lens for long enough (over 30 minutes), and re-open it, all management clusters will be disconnected because even refresh tokens will have expired. Now you can choose "Reconnect" from a management cluster's context menu to re-establish the connection.
- Use the new _Disconnect_ management cluster context menu option to remove a management cluster.
- Choose _Open in browser_ from a management cluster's context menu to open it in the browser.
- The Lens Catalog is populated with __fake__ items for MCC credentials, SSH keys, proxies, and licenses. Each item has a customized data panel visible by choosing _View details_ from its context menu.
    - The data panel is not connected to any real data, and is missing many properties yet to be added.

## v4.0.0-alpha.0

⚠️ This is an early alpha build and is not fully functional/tested.

- Main Cluster view is replaced with the new SyncView
- User is prompted to add their first magament cluster
- User can choose which projects to sync, seeing metadata from each project (cluster, ssh key, proxy counts)
- SyncView then shows the management clusters being synced, and projects selected for sync under each one, including same metadata for each project
- Synced mamagenemt clusters are restored after quitting and re-opening Lens
- No syncing actually takes place yet
- Selective Sync button is not functional

## v3.1.1

### Patch

- Fix `CVE-2022-0484` security issue allowing remote code execution by an attacker providing a spoofed MCC management cluster URL that has a `config.js` with a malicious value for the Keycloak URL (e.g. `file:/...` which could run code on the local system).
    - Going forward, only `http/s:` Keycloak URLs are permitted.

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
