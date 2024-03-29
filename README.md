 # Mirantis Container Cloud Lens Extension

![CI](https://github.com/Mirantis/lens-extension-cc/workflows/CI/badge.svg?branch=master&event=push)

A [Lens](https://k8slens.dev/) extension that enables you to connect to management clusters and synchronize their resources into the Lens Catalog.

Requires Lens `>= 6.0.0` and Mirantis Container Cloud `>= 2.19`

> ⚠️ If you are upgrading from __extension__ version 3.x to 4.x, please see our [upgrade instructions](#upgrading-from-v3-to-v4) __before upgrading__.

## Installing

> 💬 If you plan on working on the extension code, follow the [development](./CONTRIBUTING.md#development) instructions instead of these.

Installation is very easy! Just make sure Lens is running, and follow these simple steps:

1. Switch to the Extensions view (`CMD+SHIFT+E` on macOS).
2. Enter the name of this extension, `@mirantis/lens-extension-cc`, into the __Install Extension__ box.
3. Click on the __Install__ button.
4. Make sure the extension is enabled.

![Extension UI](./docs/ext-install-by-name.png)

You should now see a __Mirantis Container Cloud__ button in the top bar, on the right hand side. Click this button to access the extension's features.

## Upgrading

To upgrade to a newer release, go to the Extensions view (`CMD+SHIFT+E` on macOS), [uninstall](#uninstalling) the extension, and then [re-install](#installing) it again.

## Uninstalling

Go to the Lens Extensions view (`CMD+SHIFT+E` on macOS) and click the __Uninstall__ button next to this extension.

## SSO required

Mirantis Container Cloud instances that use third-party SSO authentication via __Keycloak__ are __required__ in order to use this extension.

The extension does not support management clusters using the old basic authentication method.

## Authorization flow

When connecting to a management cluster that uses SSO, Lens will open its SSO authorization page in your default browser.

Once authorized, Keycloak will redirect to the `lens://...` URL, triggering the browser to ask permission to open the Lens app to process the request (unless permission was granted previously with the _always allow_ check box for your SSO ID Provider, e.g. `accounts.google.com`):

![Lens protocol permission - always allow](docs/lens-protocol-permission.png)

> ⚠️ Even if you check the "Always allow" box, your browser may still continue to show a popup message waiting for you to click on an "Open Lens.app" button. This is a built-in security feature. Please be on the look out for this popup in your browser whenever accessing your Container Cloud management cluster.

Whether the permission was already given, or upon clicking the __Open Lens.app__ button, Lens will receive focus again, and the extension will then obtain access to the management cluster.

The temporary browser window used for SSO authorization may still be open, and can now be closed manually.

## Tutorial

### Adding your first management cluster

Click on the __Mirantis Container Cloud__ button in the top bar, on the right side, to activate the extension.

![Welcome](./docs/v4-01-welcome.png)

When there are no management clusters, you'll see the Welcome screen, as above. Click on the button at the bottom.

![Connect to cloud](./docs/v550-01-add-cloud.png)

- __Management cluster name:__ Enter a friendly name of your choice (no spaces or special characters allowed) for the management cluster you will connect to. This name will be used in Catalog labels to identify resources belonging to this management cluster in order to help with searching/filtering.
- __Management cluster URL:__ Enter the URL to the management cluster itself.
    - 💬 This is not the URL to a child cluster inside the management cluster. The management cluster is essentially the Mirantis Container Cloud _instance_. However, using a child cluster URL is OK as the extension will use it to determine the proper URL for you.
- __Use offline tokens:__ (✳️ New in [v5.5.0](CHANGELOG.md#v550)) By default, short-lived (more secure) cluster access tokens are used in the generated kubeconfigs used by Lens to connect to synced clusters. Enable this option to use long-lived tokens to stay connected to them for a longer period of time. See the [offline tokens](#offline-tokens) section for more information.
    - 💬 The "offline" term should not be confused with [offline support](#offline-support). A network connection is always necessary in order to get the latest cluster status.
- __Trust this host:__ (✳️ New in [v5.5.0](CHANGELOG.md#v550)) By default, the extension will not connect to management clusters that use __self-signed certificates__ or have expired/invalid certificates. If that is your scenario, and you trust the endpoint, then check this option.
    - ⚠️ Trusting a host is inherently __unsafe__. [Read more](#trusted-hosts) about this option before using it.

When you click on __Connect__, your default browser will open to the management cluster's sign in screen.

Complete the sign in and you should then be redirected to Lens via a confirmation dialog like this (in your browser):

![Protocol permission](./docs/lens-protocol-permission.png)

> Be sure to allow the redirect. Otherwise, the extension will fail to connect to the management cluster. If the browser window remains open, you can safely close it manually.

In a few seconds, the extension will list all the projects it discovered in the management cluster. These are the projects you can access with the account your used for sign in:

![Sync preview](./docs/v4-03-sync-preview.png)

Make your project selection for synchronization, and choose whether __future projects__ should be automatically synced. This means that any projects created in the future will be automatically added to your sync selection, and their resources automatically added to the Catalog. Otherwise, new projects will be ignored.

> 💬 Deleting an existing, synced project from the Container Cloud API or browser UI will result in the project (and it's related resources) being removed from Lens automatically.

Finally, click on __Synchronize selected projects__ to complete the setup.

### Sync View

![Sync View](./docs/v4-04-sync-overview.png)

After adding a new management cluster, you'll be shown the __Sync View__. As highlighted, the __Name__ column on the far left shows the short name for the management cluster, along with all synced projects. Under each project, you'll find the number of resources that have been synced to Lens and are available in the Catalog.

The highlighted __Status__ column on the far right shows the current sync status of each project, as well as the connection status to the management cluster. As sync takes place periodically (every 5 minutes or so), the management cluster's status will change from "Connected" to "Updating" whenever it's synchronizing.

> 💡 Click the __Selective sync__ button (top/right corner) to update management cluster sync settings (e.g. which projects to sync, or use of [offline tokens](#offline-tokens) for synced clusters).

### Lens Catalog

Once the sync status is "Connected" and all projects are "Synced", head over to the Lens Catalog and choose __Clusters__ from the Category Browser on the left hand side. You should now see all the clusters that were synced (across all synced management clusters and projects):

![Lens Catalog](./docs/v4-05-catalog.png)

Notice there are new categories in the Category Browser:

- MCC Credentials
- MCC SSH Keys
- MCC Proxies
- MCC RHEL Licenses

These are simply quick filters on specific resource types, just like "Clusters" and "Web Links".

Click __Browse__ at the very top of the Category Browser to see all items in a single list. Use the __Search__ box at the top/right to filter.

For example, entering `project=NAME` (replace `NAME` with the name of a project you synced) in the Search box will filter the Catalog to show only those that belong to that project.

### Item details

To see details about any synced resource, use its context menu in the Catalog and choose __View details__:

![Catalog item context menu](./docs/v4-06-catalog-ctx-menu.png)

This will show a __Details panel__ with additional information about the resource. This is the same kind of information you would normally find in the Container Cloud browser UI. Here, we see the details for a cluster:

![Catalog details](./docs/v4-07-catalog-details.png)

> 💬 There are `Status` and `MCC Status` fields: The difference is `Status` (near the top) represents the __Lens connection status__ (whether it's connected to the cluster to introspect its details via the [Cluster View](#cluster-metrics), while `MCC Status` (further down in a separate section)

### Cluster metrics

When you're ready to introspect a synced cluster, just click on it in the Catalog, same as you would any other cluster.

> 💬 Since Lens requires special credentials to access clusters and introspect them, your default browser window will open again, and you'll need to sign into the management cluster again. Once Lens has the special credentials, this shouldn't be necessary again until they expire.

![Cluster metrics](./docs/v4-08-cluster-view.png)

### Cluster pages

✳️ __New in [v5.3.0](CHANGELOG.md#v530)__

When you're in the Lens cluster view, you can now find Mirantis Container Cloud-specific information in the __Container Cloud__ pages accessible at the bottom of the sidenav (highlighted in red below).

![Cluster pages - Overview](./docs/v530-01-cluster-pages-overview.png)

The overview page also provides information about all the cluster's conditions.

![Cluster pages - Conditions](./docs/v530-02-cluster-pages-conditions.png)

Cluster- and machine-related events are available in the second tab.

> 💡 Events are updated every ~5 minutes. Click on the __Refresh__ button in the toolbar (highlighted in red below) to refresh the list right away.

![Cluster pages - Events](./docs/v530-03-cluster-pages-events.png)

(✳️ __New in [v5.6.0](CHANGELOG.md#v560), requires MCC v2.22+__) Cluster- and machine-related deployment and upgrade history are available in the third tab.

> 💡 History is updated every ~5 minutes. Click on the __Refresh__ button in the toolbar (highlighted in red below) to refresh the list right away.

![Cluster pages - History](./docs/v560-01-cluster-pages-history.png)

Finally, the details page provides all the information normally available from the Catalog's "View details" slide-in panel so that it isn't necessary to go back to the Catalog to get that data.

![Cluster pages - Details](./docs/v530-04-cluster-pages-details.png)

### Reconnecting a management cluster

If the management cluster becomes "Disconnected", it's simply because the user session used for connection and API access has expired and it needs to be reconnected. In this case, use the management cluster's context menu and choose the __Reconnect__ option:

![Management cluster context menu](./docs/v4-09-sync-view-ctx-menu.png)

> 💬 As when adding a new management cluster, this will cause your default browser to open and you'll need to sign into the management cluster again. After the sign in is complete, you'll be redirected to Lens. If Lens doesn't re-focus, just re-focus the app. You can satefly close the browser window that was opened.

### Adding more management clusters

The extension can sync multiple management clusters at the same time. Click on the __Connect new Management Cluster__ button at the bottom/right corner of the [Sync View](#sync-view) to add more of them.

### Removing a management cluster

To remove a management cluster, choose the __Remove__ option from the management cluster's context menu in the [Sync View](#sync-view).

> ⚠️ Removing a management cluster will also remove all of its synced projects and resources from Lens.

### Update sync selection

To update the synchronization settings for any management cluster, click the __Selective sync__ button at the top/right corner of the [Sync View](#sync-view).

The screen will then update to show not only synced projects, but also ignored projects, where you'll be able to update your selections. The __future sync__ setting for each management cluster can also be changed from the Selective Sync view.

![Selective Sync view](./docs/v4-10-selective-sync.png)

Once you've updated your selections, click the __Synchronize selected projects__ button at the top/right corner of the Selective Sync view.

Click __Cancel__ (next to the _Synchronize selected projects_ button) to back out without making any changes.

## Offline support

Whether a management cluster becomes _disconnected_ and is not re-connected for a while, or Lens is closed for a long period of time, all resources that were last synced prior to disconnection or quitting the app will be kept in the Catalog and restored in Lens the next time it's opened.

Just reconnect when you're able and let the synchronization process update to the current state of things in order to keep your Catalog up-to-date.

> ❗️ A network connection is always necessary in order to have the most up-to-date cluster data and status. This is simply a convenience feature should you have to use Lens while temporarily offline.

## Offline tokens

✳️ __New in [v5.5.0](CHANGELOG.md#v550)__

The `Use offline tokens` option (offered both when [adding](#adding-your-first-management-cluster) a management cluster, or updating its sync settings via the [Selective sync](#sync-view) view) determines whether the cluster access tokens are short-lived or long-lived.

When a cluster is synced via this extension, a kubeconfig file is generated. This file is then used by Lens to connect with the cluster when opening it from the Catalog.

The kubeconfig is configured to use the [kube-login](https://github.com/int128/kubelogin) binary (bundled with the extension) to enable Lens to obtain cluster access tokens (different from the API access token used to "connect" to a management cluster).

This is why your default browser is toggled when you open the cluster for the first time (or whenever the tokens expire and Lens needs to obtain new ones).

> ⚠️ Expired tokens [can cause some havoc](https://github.com/lensapp/lens/issues/6966), especially when the tokens are short-lived, though using long-lived tokens would not necessarily make you immune to this issue; it would simply push it off further into the future.

These cluster access tokens are those which are partially configured via the `Use offline tokens` option, which applies uniformally to all synced clusters from a given management cluster.

> 💬 "Offline" tokens should not be confused with [offline support](#offline-support), which is about retaining the ability to see synced objects even when temporarily offline (disconnected from your network). Eventually, even long-lived tokens will expire and will need to be renewed.

## Trusted hosts

✳️ __New in [v5.5.0](CHANGELOG.md#v550)__

By default, the extension does not support management clusters that use self-signed certificates (or certificates that are expired, or not verifiable for whatever reason) over `HTTPS` connections. They are treated as untrusted hosts for security reasons (because their identity cannot be verified).

> ❗️ Mirantis does not recommend connecting to an unverified host and takes no responsibility whatsoever for any negative consequences that may ensue. The host could be one posing as the real thing, but in actuality, one owned by a threat actor with malicious goals. This extension is [MIT-licensed](./LICENSE). Proceed at your own risk.

There are some legitimate reasons to use self-signed certificates, however, and it is possible to connect to a management cluster that uses one by setting the `Trust this host` option offered when [adding](#adding-your-first-management-cluster) a management cluster.

When trusting a management cluster, the trust also applies to __all clusters synced__ through it, which means that all generated cluster kubeConfigs will also skip TLS verification.

> ⚠️ This flag can only be set when __adding__ the management cluster. This is because a host that uses a self-signed certificate typically continues to do so into the future.
>
> If your management cluster's certificate suddenly expires, contact your IT department and ask them to look into the issue before resorting to trusting the host.

To __untrust__ the host, remove the management cluster, and add it again without the `Trust this host` option enabled.

It's not possible to trust a host you've already added on the premise that if a host's certificate becomes invalid, it's a good indication that something might be amis and should be verified/rectified prior to reconnecting. Contact your IT department and ask them to look into the issue before resorting to trusting the host.

If a host had to be trusted when it was added, we're assuming it probably always has to be trusted (e.g. it's an internal, test, or demo system that always uses a self-signed certificate) and there would be no reason to suddenly no longer trust it and require TLS verification. However, if this is something you _frequently_ encounter, please let us know by [opening an issue](https://github.com/Mirantis/lens-extension-cc/issues) and explaining your use case.

> 💬 This option is irrelevant to management clusters using unsecure `HTTP` connections as certificates are involved in the connection handshake.

## FAQ

- I was able to add my cluster to Lens, but Lens fails to show it because of an authentication error.
    - Check if the cluster is only accessible over a private network (i.e. VPN) connection, and try opening it in Lens once connected to the network. Even though you can see the cluster in Container Cloud, as well as in the extension, accessing the cluster's details may still require a VPN connection in this case.
- My management cluster gets disconnected after a while.
    - Access tokens (which are obtained by the extension when you [authorize access](#authorization-flow) to your management clusters) have a ~5 minute lifespan and come with refresh tokens that last up to ~30 minutes.
    - Typically, the extension is able to renew these tokens for a few hours, but once the renewal is no longer possible (for security reasons, a more recent authorization becomes necessary), a management cluster will become disconnected even while Lens is still running.
    - Quitting Lens for more than 30 minutes will definitely result in disconnection as the access token (which has a ~5 minute lifespan) as well as the refresh token, which has a ~30 minute lifespan, will both have expired.
- Lens keeps toggling my browser to authenticate with a synced cluster.
    - This appears to be an [issue with Lens](https://github.com/lensapp/lens/issues/6966), not this extension. The kubeconfig provided to Lens for the synced cluster is valid, though it's different from kubeconfigs normally used by Lens in that it doesn't contain any offline tokens. Instead, it causes Lens to go through the [kube-login](https://github.com/int128/kubelogin) binary (bundled with the extension) to obtain SSO tokens, and `kube-login` goes through your system's default browser to obtain those tokens.
    - Quitting and restarting Lens normally fixes the issue.
    - If the issue persists after quitting Lens (and leaving it closed because you don't need to use it for a while), then you may need to check for rogue Lens-related processes in your operating system's process explorer app and kill those lingering ones for the behavior to stop.
    - 💡 As of [v5.5.0](CHANGELOG.md#v550), it's possible to work around this issue by using [offline tokens](#offline-tokens) for cluster access.

## Upgrading from v3 to v4

### Manually added clusters no longer supported

As the extension underwent a near complete rewrite for version 4 which provides a completely new way of getting Mirantis Container Cloud clusters into Lens (manual, single selection to full synchronization across multiple management clusters), clusters previously added to Lens via the extension __are no longer supported__ and __will be removed__ from Lens upon upgrading.

__Before upgrading to v4__, be sure to take note of which clusters you added, and from which management cluster and project they came from, so you can [add those management clusters](#adding-your-first-management-cluster) and select those projects in order to have those clusters synced into Lens.

### Add to Lens from MCC no longer supported

The minimum supported version of Mirantis Container Cloud is `2.19` as the browser UI no longer has the old __Add to Lens__ cluster context menu item that the extension no longer supports.

If you're using an older version of MCC and attempt to use the _Add to Lens_ menu item in the browser UI, you will get an error message in the extension in Lens.

## Contributing

See our [contribution guide](./CONTRIBUTING.md).

## API

See our [API docs](./API.md).
