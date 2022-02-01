import React from 'react';
import { Common, Renderer } from '@k8slens/extensions';
import { GlobalPage, GlobalPageIcon } from './components/GlobalPage/GlobalPage';
import {
  ClusterPage,
  ClusterPageIcon,
} from './components/ClusterPage/ClusterPage';
import * as strings from '../strings';
import * as consts from '../constants';
import { ROUTE_GLOBAL_PAGE, ROUTE_CLUSTER_PAGE } from '../routes';
import { dispatchExtEvent } from './eventBus';
import { prefStore } from '../store/PreferenceStore';
import { cloudStore } from '../store/CloudStore';
import { clusterStore } from '../store/ClusterStore';
import { logger as loggerUtil } from '../util/logger';
import { IpcRenderer } from './IpcRenderer';
import { SshKeyEntity } from '../catalog/SshKeyEntity';
import { CredentialEntity } from '../catalog/CredentialEntity';
import { ProxyEntity } from '../catalog/ProxyEntity';
import { CatalogEntityAddMenuContext } from '@k8slens/extensions/dist/src/common/catalog';
import { getLensClusters } from './rendererUtil';
import { mkClusterContextName } from '../util/templates';
import { EXT_EVENT_OAUTH_CODE, EXT_EVENT_ACTIVATE_CLUSTER } from './eventBus';

// NOTE: The following interface _should_ be exported by the Lens extension package
//  as `Common.Types.CatalogEntityDetailsProps`, but it's not, which is a known bug
//  that will hopefully be fixed "soon". In the meantime, we define it ourselves here.
interface CatalogEntityDetailsProps<T extends Common.Catalog.CatalogEntity> {
  entity: T;
}

const {
  LensExtension,
  Catalog,
  Component: { Notifications, DrawerTitle, DrawerItem },
} = Renderer;

const logger: any = loggerUtil; // get around TS compiler's complaining
const statusItemColor = 'white'; // CSS color; Lens hard-codes the color of the workspace indicator item to 'white' also

declare const FEAT_CLUSTER_PAGE_ENABLED: any; // TODO[clusterpage]: remove

export default class ExtensionRenderer extends LensExtension {
  //
  // PROPERTIES AND PROPERTY METHODS
  //

  globalPages = [
    {
      id: ROUTE_GLOBAL_PAGE,
      components: {
        Page: () => <GlobalPage />,
      },
    },
  ];

  // NOTE: the cluster page is dynamically added to the cluster menu in onActivate()
  //  depending on what the active entity is at the time
  clusterPages = [
    {
      id: ROUTE_CLUSTER_PAGE,
      components: {
        Page: () => <ClusterPage />,
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
  statusBarItems = [
    {
      item: (
        <div
          className="flex align-center gaps"
          title={strings.extension.statusBar['label']()}
          onClick={() => this.navigate(ROUTE_GLOBAL_PAGE)}
        >
          <GlobalPageIcon size={16} fill={statusItemColor} />
        </div>
      ),
    },
  ];

  catalogEntityDetailItems = [
    {
      kind: SshKeyEntity.kind,
      apiVersions: [SshKeyEntity.apiVersion],
      components: {
        Details: (props: CatalogEntityDetailsProps<SshKeyEntity>) => (
          <>
            <DrawerTitle
              title={strings.catalog.entities.sshKey.details.title()}
            />
            <DrawerItem
              name={strings.catalog.entities.sshKey.details.props.publicKey()}
            >
              {props.entity.spec.publicKey}
            </DrawerItem>
          </>
        ),
      },
    },
    {
      kind: CredentialEntity.kind,
      apiVersions: [CredentialEntity.apiVersion],
      components: {
        Details: (props: CatalogEntityDetailsProps<CredentialEntity>) => (
          <>
            <DrawerTitle
              title={strings.catalog.entities.credential.details.title()}
            />
            <DrawerItem
              name={strings.catalog.entities.credential.details.props.provider()}
            >
              {props.entity.spec.provider}
            </DrawerItem>
          </>
        ),
      },
    },
    {
      kind: ProxyEntity.kind,
      apiVersions: [ProxyEntity.apiVersion],
      components: {
        Details: (props: CatalogEntityDetailsProps<ProxyEntity>) => (
          <>
            <DrawerTitle
              title={strings.catalog.entities.proxy.details.title()}
            />
            <DrawerItem
              name={strings.catalog.entities.proxy.details.props.region()}
            >
              {props.entity.spec.region}
            </DrawerItem>
          </>
        ),
      },
    },
  ];

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
      this.navigate(ROUTE_GLOBAL_PAGE);
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
    this.navigate(ROUTE_GLOBAL_PAGE);

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
      pathSchema: `/${EXT_EVENT_OAUTH_CODE}`,
      handler: this.handleProtocolOauthCode,
    },
  ];

  /**
   * Handles the Catalog's Context Menu Open event.
   * @param {Common.Catalog.KubernetesCluster} cluster Cluster related to the event.
   *  This could be from __any source__, but will be of the KubernetesCluster type.
   * @param {Common.Catalog.CatalogEntityContextMenuContext} ctx Context menu utility.
   */
  protected handleClusterContextMenuOpen = async (cluster, ctx) => {
    if (cluster.metadata.source !== consts.catalog.source) {
      return; // not one of our clusters: ignore it
    }

    // CLUSTER SETTINGS
    ctx.menuItems.push({
      title: strings.renderer.catalog.contextMenuItems.settings.title(),
      icon: 'edit', // pencil, like Lens uses on its own cluster items
      onClick: () => ctx.navigate(`/entity/${cluster.metadata.uid}/settings`),
    });

    // REMOVE CLUSTER (but keep kubeConfig file)
    ctx.menuItems.push({
      title: strings.renderer.catalog.contextMenuItems.remove.title(),
      icon: 'delete',
      onClick: async () => {
        try {
          await IpcRenderer.getInstance().invoke(
            consts.ipcEvents.invoke.REMOVE_CLUSTER,
            cluster.metadata.uid
          );
        } catch (err) {
          logger.error(
            'ExtensionRenderer.clusterContextMenu.remove.onClick()',
            `Error during cluster removal, clusterId=${cluster.metadata.uid}, error="${err.message}"`
          );
          Notifications.error(
            `${strings.renderer.catalog.contextMenuItems.remove.error.errorDuringRemove(
              cluster.metadata.name
            )} ${strings.noteOwner}`
          );
        }
      },
      confirm: {
        message: strings.renderer.catalog.contextMenuItems.remove.confirm(
          cluster.metadata.name
        ),
      },
    });

    // DELETE CLUSTER (including kubeConfig file)
    ctx.menuItems.push({
      title: strings.renderer.catalog.contextMenuItems.delete.title(),
      icon: 'delete_forever',
      onClick: async () => {
        try {
          await IpcRenderer.getInstance().invoke(
            consts.ipcEvents.invoke.DELETE_CLUSTER,
            cluster.metadata.uid
          );
        } catch (err) {
          logger.error(
            'ExtensionRenderer.clusterContextMenu.delete.onClick()',
            `Error during cluster deletion, clusterId=${cluster.metadata.uid}, error="${err.message}"`
          );
          Notifications.error(
            `${strings.renderer.catalog.contextMenuItems.delete.error.errorDuringDelete(
              cluster.metadata.name
            )} ${strings.noteOwner}`
          );
        }
      },
      confirm: {
        message: strings.renderer.catalog.contextMenuItems.delete.confirm(
          cluster.metadata.name
        ),
      },
    });
  };

  protected handleClusterCatalogMenuOpen = (
    ctx: CatalogEntityAddMenuContext
  ) => {
    ctx.menuItems.push({
      icon: 'dns', // TODO: need better icon
      title: strings.catalog.entities.cluster.catalogMenu.create.title(),
      onClick: async () => {
        logger.log(
          'ExtensionRenderer.clusterCatalogMenu.newCluster.onClick()',
          'Creating new cluster...'
        );
      },
    });
  };

  /**
   * Updates the cluster page menus with our custom cluster page menu item if
   *  the active Catalog entity is an MCC cluster.
   * @param {Object} activeEntity
   */
  public async isEnabledForCluster(cluster): Promise<boolean> {
    // TODO[clusterpage]: remove flag
    if (FEAT_CLUSTER_PAGE_ENABLED) {
      const entity = Renderer.Catalog.catalogEntities.getById(cluster.id);

      // TODO[#498]: We should ALWAYS have an entity, but we may not.
      //  https://github.com/lensapp/lens/issues/3790
      return entity?.metadata.source === consts.catalog.source;
    }

    return false;
  }

  //
  // METHODS
  //

  // WARNING: Lens calls this method more often that just when the extension
  //  gets activated. For example, it will call it _again_ if it adds a cluster
  //  page and the cluster page is activated.
  onActivate() {
    logger.log('ExtensionRenderer.onActivate()', 'extension activated');

    prefStore.loadExtension(this);
    cloudStore.loadExtension(this);
    clusterStore.loadExtension(this);
    IpcRenderer.createInstance(this); // AFTER load stores

    const category = Catalog.catalogCategories.getForGroupKind(
      consts.catalog.entities.kubeCluster.group,
      consts.catalog.entities.kubeCluster.kind
    );

    if (category) {
      category.on('contextMenuOpen', this.handleClusterContextMenuOpen);
      category.on('catalogAddMenu', this.handleClusterCatalogMenuOpen);
    } else {
      logger.warn(
        'ExtensionRenderer.onActivate()',
        `Unable to add ${consts.catalog.entities.kubeCluster.type} context menu items: No related category found in the Catalog!`
      );
    }

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
    if (FEAT_CLUSTER_PAGE_ENABLED) {
      this.clusterPageMenus = [
        {
          target: { pageId: ROUTE_CLUSTER_PAGE },
          title: strings.clusterPage.menuItem(),
          components: {
            Icon: () => <ClusterPageIcon size={30} />,
          },
        },
      ];
    }
  }

  onDeactivate() {
    logger.log('ExtensionRenderer.onDeactivate()', 'extension deactivated');
  }
}
