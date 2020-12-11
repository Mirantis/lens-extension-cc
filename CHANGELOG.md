# ChangeLog

## UNRELEASED

### Added

- Current extension version is now displayed in the bottom/right corner of the Help panel.

### Changed

- Fixed bug where 'add clusters' protocol action would show loader when actually adding clusters, rather than just when loading clusters.
- Removed test 'EVENT' status bar item.

## 2.0.0-alpha.2

### Added

- Another protocol integration: Ability to open an already added MCC cluster in Lens.

### Changed

- Removed the '1-2-3' sequence on the main headings since not all steps are always visible depending on whether the extension is being used normally, or as a result of clicking on a `lens://` link.

## 2.0.0-alpha.1

### Changed

- Fixed: Protocol request handlers are now removed when the extension is deactivated.

## 2.0.0-alpha.0

### Added

- New Preferences Panel, which moves the preferences out of the main extension body and into the side panel.
- New `lens://` protocol integrations (requires code on Lens [hackweek-protocol-handler](https://github.com/lensapp/lens/tree/hackweek-protocol-handler) branch to work with Lens):
    - Add clusters directly from MCC in the browser as kubeConfigs.
    - Add selected clusters from MCC in the browser. This requires providing your password prior to adding the clusters you select (because each cluster gets its own kubeConfig file, and each one needs its own cluster access-specific token), but no longer requires you to copy/paste the MCC instance URL into the extension and signing in that way.

### Changed

- When adding clusters, kubeConfig files will not be generated for clusters which are already in Lens.
- The "save location" field is now read-only. You must use the folder picker to choose an existing folder.
- A notification is now posted listing all new clusters added to Lens.

## 1.0.5

Update for Lens `4.0.0` official release.

## 1.0.4

### Changed

- Adjusted the padding on the status bar item so it isn't so squished in the right corner or against other status bar extension items.
- Adjusted the color of the status bar item to always be white regardless of the theme (which fixes an issue where it was a dark color when switching to the LIGHT theme).
- Now relying on Lens to provide styling for custom scrollbars (see [lens#1484](https://github.com/lensapp/lens/pull/1484)).

## 1.0.3

Update for Lens `4.0.0-rc.1`.

### Changed

- Removed deprecated (and now removed) global page `addRoute` property.

## 1.0.2

This release contains no code changes.

### Added

- Missing standard package.json metadata
- Screen shot to README

## 1.0.1

This release contains no code changes.

### Added

- NPM-based installation instructions to the README

## 1.0.0

### Added

- Initial release! 🎉
