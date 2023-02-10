import React from 'react';
import { Renderer } from '@k8slens/extensions';
import { GlobalPage } from './components/GlobalPage/GlobalPage';
import { ContainerCloudIcon as ClusterPageIcon } from './components/ContainerCloudIcon';
import { ClusterPage } from './components/ClusterPage/ClusterPage';
import { ClusterOverviewView } from './components/ClusterPage/Overview/ClusterOverviewView';
import { ClusterDetailsView } from './components/ClusterPage/Details/ClusterDetailsView';
import { ClusterEventsView } from './components/ClusterPage/Events/ClusterEventsView';
import { ClusterHistoryView } from './components/ClusterPage/History/ClusterHistoryView';
import * as strings from '../strings';
import * as consts from '../constants';
import {
  ROUTE_SYNC_VIEW,
  ROUTE_CLUSTER_OVERVIEW,
  ROUTE_CLUSTER_HISTORY,
  ROUTE_CLUSTER_EVENTS,
  ROUTE_CLUSTER_DETAILS,
} from '../routes';
import {
  EXT_EVENT_OAUTH_CODE,
  EXT_EVENT_ACTIVATE_CLUSTER,
  dispatchExtEvent,
} from '../common/eventBus';
import { cloudStore } from '../store/CloudStore';
import { syncStore } from '../store/SyncStore';
import { logger as loggerUtil } from '../util/logger';
import { IpcRenderer } from './IpcRenderer';
import { getLensClusters } from './rendererUtil';
import { mkClusterContextName } from '../util/templates';
import { catalogEntityDetails } from './catalogEntityDetails';
import { generateTopBarItems } from './topBarItems';
import { openBrowser } from '../util/netUtil';
import { generateEntityUrl } from '../catalog/catalogEntities';
import { KubernetesCluster } from '@k8slens/extensions/dist/src/common/catalog-entities';

const {
  LensExtension,
  Catalog,
  Component: { Notifications },
} = Renderer;

const logger: any = loggerUtil; // get around TS compiler's complaining
const CLUSTER_PAGE_ID = 'mcc-cluster-page';

declare const FEAT_CLUSTER_PAGE_HISTORY_ENABLED: any;

export default class ExtensionRenderer extends LensExtension {
  //
  // PROPERTIES AND PROPERTY METHODS
  //

  globalPages = [
    {
      id: ROUTE_SYNC_VIEW,
      components: {
        Page: () => <GlobalPage />,
      },
    },
  ];

  // NOTE: the cluster page is dynamically added to the cluster menu in onActivate()
  //  depending on what the active entity is at the time
  clusterPages = [
    {
      id: ROUTE_CLUSTER_OVERVIEW,
      components: {
        Page: () => (
          <ClusterPage>
            <ClusterOverviewView />
          </ClusterPage>
        ),
      },
    },
    {
      id: ROUTE_CLUSTER_EVENTS,
      components: {
        Page: () => (
          <ClusterPage>
            <ClusterEventsView />
          </ClusterPage>
        ),
      },
    },
    ...(FEAT_CLUSTER_PAGE_HISTORY_ENABLED
      ? [
          {
            id: ROUTE_CLUSTER_HISTORY,
            components: {
              Page: () => (
                <ClusterPage>
                  <ClusterHistoryView />
                </ClusterPage>
              ),
            },
          },
        ]
      : []),
    {
      id: ROUTE_CLUSTER_DETAILS,
      components: {
        Page: () => (
          <ClusterPage>
            <ClusterDetailsView />
          </ClusterPage>
        ),
      },
    },
  ];

  // NOTE: mobx and Emotion components apparently don't mix well, and neither do
  //  mobx and plain React components with inline `style` props. Components given
  //  to `statusBarItems` are deeply observed by mobx. If an Emotion component is
  //  present in the hierarchy (or just a regular component with the `style` prop),
  //  mobx goes berserk throws the following exception (or similar):
  // ============
  // Uncaught (in promise) RangeError: Maximum call stack size exceeded
  //     at initializeInstance (mobx.module.js:332)
  //     at isObservableObject (mobx.module.js:4411)
  //     at _isObservable (mobx.module.js:2550)
  //     at isObservable (mobx.module.js:2560)
  //     at deepEnhancer (mobx.module.js:401)
  //     at new ObservableValue (mobx.module.js:1031)
  //     at ObservableObjectAdministration../node_modules/mobx/lib/mobx.module.js.ObservableObjectAdministration.addObservableProp (mobx.module.js:4209)
  //     at mobx.module.js:453
  //     at decorate (mobx.module.js:363)
  //     at decoratorFactory (mobx.module.js:384)
  // ============

  topBarItems = generateTopBarItems(this);

  catalogEntityDetailItems = catalogEntityDetails;

  protected handleProtocolActivateCluster = ({ search }) => {
    const { username, namespace, clusterName } = search;
    const existingLensClusters = getLensClusters();
    const context = mkClusterContextName({ username, namespace, clusterName });

    const lensCluster = existingLensClusters.find(
      (cluster) => cluster.spec.kubeconfigContext === context
    );

    if (lensCluster) {
      Renderer.Navigation.navigate(`/cluster/${lensCluster.metadata.uid}`);
    } else {
      this.navigate(ROUTE_SYNC_VIEW);
      Notifications.error(
        strings.renderer.clusterActions.error.clusterNotFound(
          `${namespace}/${clusterName}`
        )
      );
    }

    dispatchExtEvent({
      type: EXT_EVENT_ACTIVATE_CLUSTER,
      data: search,
    });
  };

  protected handleProtocolOauthCode = ({ search }) => {
    dispatchExtEvent({
      type: EXT_EVENT_OAUTH_CODE,
      state: search.state,
      data: search,
    });
  };

  protocolHandlers = [
    {
      pathSchema: `/${EXT_EVENT_ACTIVATE_CLUSTER}`,
      handler: this.handleProtocolActivateCluster,
    },
    {
      // NOTE: we need this on RENDERER also because we temporarily connect to
      //  Clouds when adding new ones (to preview their namespaces)
      pathSchema: `/${EXT_EVENT_OAUTH_CODE}`,
      handler: this.handleProtocolOauthCode,
    },

    // legacy APIs we no longer support
    {
      pathSchema: '/kubeConfig',
      handler() {
        Notifications.error(strings.extension.legacy.kubeConfigProtocol(), {
          timeout: 0,
        });
      },
    },
    {
      pathSchema: '/addClusters',
      handler() {
        Notifications.error(strings.extension.legacy.addClustersProtocol(), {
          timeout: 0,
        });
      },
    },
  ];

  /**
   * Handles the Catalog's Context Menu Open event for a Kubernetes Cluster entity.
   * @param {Common.Catalog.KubernetesCluster} entity Cluster related to the event.
   *  This could be from __any source__, but will be of the KubernetesCluster type.
   * @param {Common.Catalog.CatalogEntityContextMenuContext} ctx Context menu utility.
   */
  protected handleCatalogClusterContextMenuOpen = async (entity, ctx) => {
    if (entity.metadata.source !== consts.catalog.source) {
      return; // not one of our clusters: ignore it
    }

    // CLUSTER SETTINGS (standard item provided by Lens on its own cluster entities
    //  that we have to provide here also since customizing the context menu means
    //  we lose all of Lens' standard items that users look for anyway)
    ctx.menuItems.push({
      title: strings.catalog.entities.cluster.contextMenu.settings.title(),
      icon: 'edit', // pencil, like Lens uses on its own cluster items
      onClick: async () =>
        ctx.navigate(`/entity/${entity.metadata.uid}/settings`),
    });

    // OPEN IN BROWSER
    ctx.menuItems.push({
      title: strings.catalog.entities.common.contextMenu.browserOpen.title(),
      icon: 'launch',
      onClick: async () => {
        openBrowser(generateEntityUrl(entity));
      },
    });
  };

  // TODO: once we're ready to support creating this item type from Lens
  //  (this is for the big blue "+" button at the bottom/right corner of the Catalog)
  //  WILL NEED: `import { CatalogEntityAddMenuContext } from '@k8slens/extensions/dist/src/common/catalog';`
  // /**
  //  * Called when the user clicks on the big blue "+" button at the bottom/right
  //  *  corner of the Catalog.
  //  */
  // protected handleCatalogClusterMenuOpen = (
  //   ctx: CatalogEntityAddMenuContext
  // ) => {
  //   ctx.menuItems.push({
  //     icon: 'dns', // TODO: need better icon
  //     title: strings.catalog.entities.cluster.catalogMenu.create.title(),
  //     onClick: async () => {
  //       logger.log(
  //         'ExtensionRenderer.clusterCatalogMenu.newCluster.onClick()',
  //         'Creating new cluster...'
  //       );
  //     },
  //   });
  // };

  /**
   * Updates the cluster page menus with our custom cluster page menu item if
   *  the active Catalog entity is an MCC cluster.
   * @param {KubernetesCluster} cluster
   */
  public async isEnabledForCluster(
    cluster: KubernetesCluster
  ): Promise<boolean> {
    //
    // NOTE: This hook is or will soon (6.y.z) be DEPRECATED. Follow
    //  https://github.com/lensapp/lens/issues/4591#issuecomment-1275204032
    //
    const entity =
      typeof cluster.metadata.uid === 'string' // could also be an object for some reason
        ? Renderer.Catalog.catalogEntities.getById(cluster.metadata.uid)
        : undefined;

    return entity?.metadata.source === consts.catalog.source;
  }

  //
  // METHODS
  //

  protected handleNetworkOffline = () => {
    IpcRenderer.getInstance().notifyNetworkOffline();
  };

  protected handleNetworkOnline = () => {
    IpcRenderer.getInstance().notifyNetworkOnline();
  };

  // WARNING: Lens calls this method more often that just when the extension
  //  gets activated. For example, it will call it _again_ if it adds a cluster
  //  page and the cluster page is activated.
  onActivate() {
    logger.log('ExtensionRenderer.onActivate()', 'extension activated');

    const ipcRenderer = IpcRenderer.createInstance(this);

    cloudStore.loadExtension(this, { ipcRenderer });
    syncStore.loadExtension(this, { ipcRenderer });

    const category = Catalog.catalogCategories.getForGroupKind(
      consts.catalog.entities.kubeCluster.group,
      consts.catalog.entities.kubeCluster.kind
    );

    if (category) {
      category.on('contextMenuOpen', this.handleCatalogClusterContextMenuOpen);

      // NOTE: while this appears category-specific, when there is no active category in
      //  Lens (i.e. user has clicked on "Browser" item in the Catalog's sidebar), then
      //  ALL category-specific handlers are called to show ALL items in the Catalog menu
      // TODO: once we're ready to support creating this item type from Lens
      //  (this is for the big blue "+" button at the bottom/right corner of the Catalog)
      // category.on('catalogAddMenu', this.handleCatalogClusterMenuOpen);
    } else {
      logger.warn(
        'ExtensionRenderer.onActivate()',
        `Unable to add ${consts.catalog.entities.kubeCluster.type} context menu items: No related category found in the Catalog!`
      );
    }

    // NOTE: only the Renderer process has a window in Electron, so we listen here, but
    //  still ultimately broadcast to all IPC listeners across both threads
    // @see https://www.electronjs.org/docs/latest/tutorial/online-offline-events
    window.addEventListener('offline', this.handleNetworkOffline);
    window.addEventListener('online', this.handleNetworkOnline);

    // NOTE: Cluster page menu list must be STATIC. Checking here if the
    //  `Renderer.Catalog.catalogEntities.activeEntity` is an MCC cluster will
    //  not work. Neither will adding a mobx reaction like this
    //
    //    this.activeEntityDisposer = reaction(
    //      () => Renderer.Catalog.catalogEntities.activeEntity,
    //      this.updateClusterPageMenus
    //    );
    //
    //  It has to be static, and also, it's currently not possible to decide whether
    //   one cluster page is visible and another is not: It's all or nothing, and
    //   must be done by overriding the `isEnabledForCluster(cluster)` method on
    //   this class.
    //
    // NOTE: In some 6.y.z release, they introduced `Renderer.Catalog.activeCluster`
    //  which we could use __instead of the `public async isEnabledForCluster()` hook__
    //  (which should now be deprecated, I think). See
    //  https://github.com/lensapp/lens/issues/4591#issuecomment-1275204032
    //
    this.clusterPageMenus = [
      {
        id: CLUSTER_PAGE_ID,
        title: strings.clusterPage.menuItems.group(),
        components: {
          Icon: () => (
            <ClusterPageIcon
              size={20}
              style={{
                alignSelf: 'center',
                marginLeft: 1,
              }}
            />
          ),
        },
      },
      {
        parentId: CLUSTER_PAGE_ID,
        target: { pageId: ROUTE_CLUSTER_OVERVIEW },
        title: strings.clusterPage.menuItems.overview(),
        components: {
          Icon: null,
        },
      },
      {
        parentId: CLUSTER_PAGE_ID,
        target: { pageId: ROUTE_CLUSTER_EVENTS },
        title: strings.clusterPage.menuItems.events(),
        components: {
          Icon: null,
        },
      },
      ...(FEAT_CLUSTER_PAGE_HISTORY_ENABLED
        ? [
            {
              parentId: CLUSTER_PAGE_ID,
              target: { pageId: ROUTE_CLUSTER_HISTORY },
              title: strings.clusterPage.menuItems.history(),
              components: {
                Icon: null,
              },
            },
          ]
        : []),
      {
        parentId: CLUSTER_PAGE_ID,
        target: { pageId: ROUTE_CLUSTER_DETAILS },
        title: strings.clusterPage.menuItems.details(),
        components: {
          Icon: null,
        },
      },
    ];
  }

  onDeactivate() {
    logger.log('ExtensionRenderer.onDeactivate()', 'Extension deactivated');

    window.removeEventListener('offline', this.handleNetworkOffline);
    window.removeEventListener('online', this.handleNetworkOnline);
  }
}
