//
// Proxy Category and Entity
//

import { Common, Renderer, Main } from '@k8slens/extensions';
import * as consts from '../constants';
import * as strings from '../strings';
import { logger as loggerUtil } from '../util/logger';

type CatalogEntityAddMenuContext = Common.Catalog.CatalogEntityAddMenuContext;
type CatalogEntityContextMenuContext =
  Common.Catalog.CatalogEntityContextMenuContext;
type CatalogEntityMetadata = Common.Catalog.CatalogEntityMetadata;
type CatalogEntityStatus = Common.Catalog.CatalogEntityStatus;
type CatalogEntityActionContext = Common.Catalog.CatalogEntityActionContext;

const logger: any = loggerUtil; // get around TS compiler's complaining

export interface ProxyStatus extends CatalogEntityStatus {
  phase: string; // see typesets.js for possible values
}

export interface ProxySpec {
  region: string; // see typesets.js for possible values
  http: string;
  https: string;
}

export const proxyIconName = 'assistant_direction'; // must be a Material Icon name

export class ProxyEntity extends Common.Catalog.CatalogEntity<
  CatalogEntityMetadata,
  ProxyStatus,
  ProxySpec
> {
  public static readonly apiVersion = `${consts.catalog.entities.proxy.group}/${consts.catalog.entities.proxy.versions.v1alpha1}`;
  public static readonly kind = consts.catalog.entities.proxy.kind;

  public readonly apiVersion = ProxyEntity.apiVersion;
  public readonly kind = ProxyEntity.kind;

  // "runs" the entity; called when the user just clicks on the item in the Catalog
  async onRun(context: CatalogEntityActionContext) {
    // nothing to do for an SSH Key
  }

  public onSettingsOpen(): void {
    // NOTE: this function is NOT used by Lens, even though it's still in the CatalogEntity
    //  class and marked as abstract, which means we have to define it to keep TCS happy
  }

  async onContextMenuOpen(context: CatalogEntityContextMenuContext) {
    if (this.metadata.source === consts.catalog.source) {
      context.menuItems.push({
        title: strings.catalog.entities.proxy.contextMenu.browserOpen.title(),
        icon: 'launch', // NOTE: must be a string; cannot be a component that renders an icon
        onClick: async () => {
          logger.log(
            'ProxyEntity/ProxyEntity.onContextMenuOpen.browserOpen',
            'opening Proxy %s in browser...',
            this.metadata.name
          );
        },
        // can optionally show a confirmation dialog
        // confirm: {
        //   message: 'string',
        // },
      });
    }

    // emit an event via the category so that other code (and extensions, for example)
    //  can add listeners to these events and add there own entries
    const category =
      Renderer.Catalog.catalogCategories.getCategoryForEntity<ProxyCategory>(
        this
      );
    category?.emit('contextMenuOpen', this, context);
  }
}

export class ProxyCategory extends Common.Catalog.CatalogCategory {
  public readonly apiVersion = `${consts.catalog.category.group}/${consts.catalog.category.versions.v1alpha1}`;
  public readonly kind = consts.catalog.category.kind;

  public metadata = {
    name: strings.catalog.entities.proxy.categoryName(),
    icon: proxyIconName, // NOTE: must be a string; cannot be a component that renders an icon
  };

  public spec = {
    group: consts.catalog.entities.proxy.group,
    versions: [
      {
        name: consts.catalog.entities.proxy.versions.v1alpha1,
        entityClass: ProxyEntity,
      },
    ],
    names: {
      kind: ProxyEntity.kind,
    },
  };

  constructor() {
    super();

    // NOTE: this is the big blue contextual "+" button in the Catalog; items added
    //  here will be available from the button when this category is active in the
    //  Catalog
    this.on('catalogAddMenu', (ctx: CatalogEntityAddMenuContext) => {
      ctx.menuItems.push({
        icon: proxyIconName, // NOTE: must be a string; cannot be a component that renders an icon
        title: strings.catalog.entities.proxy.catalogMenu.create.title(),
        onClick: async () => {
          logger.log(
            'ProxyEntity/ProxyCategory.onCatalogAddMenu.create',
            'Creating new Proxy...'
          );
        },
      });
    });
  }
}

// NOTE: Renderer and Main will only be defined on their respective "sides", but
//  this code must run on each side, so we have to test for existence for both
Renderer?.Catalog.catalogCategories.add(new ProxyCategory());
Main?.Catalog.catalogCategories.add(new ProxyCategory());
