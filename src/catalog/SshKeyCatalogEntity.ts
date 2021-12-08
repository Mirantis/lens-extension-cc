import {
  Renderer,
  Main,
  // DEBUG TODO: the TSC complains that none of the types below are known, yet they are
  //  defined in node_modules/@k8slens/extensions/dist/src/common/catalog/catalog-entity.d.ts
  CatalogCategory,
  CatalogEntity,
  CatalogEntityAddMenuContext,
  CatalogEntityContextMenuContext,
  CatalogEntityMetadata,
  CatalogEntityStatus,
} from '@k8slens/extensions';
import * as consts from '../constants';
import { logger as loggerUtil } from '../util/logger';
// DEBUG TODO: import { WeblinkStore } from '../weblink-store';

const logger: any = loggerUtil; // get around TS compiler's complaining

export type SshKeyStatusPhase = 'available' | 'unavailable';

export interface SshKeyStatus extends CatalogEntityStatus {
  phase: SshKeyStatusPhase;
}

export type SshKeySpec = {
  publicKey: string;
};

export class SshKeyEntity extends CatalogEntity<
  CatalogEntityMetadata,
  SshKeyStatus,
  SshKeySpec
> {
  public static readonly apiVersion = `${consts.catalog.entities.sshKey.group}/${consts.catalog.entities.sshKey.versions.v1alpha1}`;
  public static readonly kind = consts.catalog.entities.sshKey.kind;

  public readonly apiVersion = SshKeyEntity.apiVersion;
  public readonly kind = SshKeyEntity.kind;

  // "runs" the entity; called when the user just clicks on the item in the Catalog
  async onRun() {
    // DEBUG window.open(this.spec.url, '_blank');
    // DEBUG TODO: somehow trigger showing details panel if possible
    logger.log('SshKeyCatalogEntity/SshKeyEntity.onRun', 'running...');
  }

  public onSettingsOpen(): void {
    // DEBUG TODO: what does this do? is this for the details panel?
    logger.log(
      'SshKeyCatalogEntity/SshKeyEntity.onSettingsOpen',
      'settings are opening'
    );
  }

  // DEBUG TODO: what is this for?
  public onDetailsOpen(): void {
    logger.log(
      'SshKeyCatalogEntity/SshKeyEntity.onDetailsOpen',
      'details are opening'
    );
  }

  async onContextMenuOpen(context: CatalogEntityContextMenuContext) {
    if (this.metadata.source === consts.catalog.source) {
      context.menuItems.push({
        title: 'Delete',
        icon: 'delete', // DEBUG NOTE: only string is supported, so must be Material icon name
        onClick: async () => {
          // DEBUG WeblinkStore.getInstance().removeById(this.metadata.uid);
          logger.log(
            'SshKeyCatalogEntity/SshKeyEntity.onContextMenuOpen.delete',
            'deleting SSH key %s',
            this.metadata.name
          );
        },
        confirm: {
          message: `Remove SSH Key "${this.metadata.name}"?`,
        },
      });
    }

    // DEBUG TODO: what does this do, and how do I do it?
    //  Renderer.Catalog. does not have something that looks like the registry
    //  object being accessed here
    catalogCategoryRegistry
      .getCategoryForEntity<SshKeyCategory>(this)
      ?.emit('contextMenuOpen', this, context);
  }
}

export class SshKeyCategory extends CatalogCategory {
  public readonly apiVersion = 'catalog.k8slens.dev/v1alpha1';
  public readonly kind = 'CatalogCategory';

  public metadata = {
    name: 'MCC SSH Keys',
    icon: 'key', // DEBUG NOTE: only string is supported, so must be Material icon name
  };

  public spec = {
    group: consts.catalog.entities.sshKey.group,
    versions: [
      {
        name: consts.catalog.entities.sshKey.versions.v1alpha1,
        entityClass: SshKeyEntity,
      },
    ],
    names: {
      kind: SshKeyEntity.kind,
    },
  };

  // DEBUG TODO: what is this? it's being called below; I don't recognize this syntax,
  //  Is it TypeScript or some new ECMAScript proposal?
  public static onAdd?: () => void;

  constructor() {
    super();

    // DEBUG NOTE: this must be the big blue "+" button
    // DEBUG TODO: there's a type error with `this.on` which seems wrong, but why?
    //  TypeEmitter is available in node_modules
    this.on('catalogAddMenu', (ctx: CatalogEntityAddMenuContext) => {
      ctx.menuItems.push({
        icon: 'key',
        title: 'Add MCC SSH Key',
        onClick: () => {
          SshKeyCategory.onAdd();
        },
      });
    });
  }
}

// DEBUG TODO: Can I actually add to both right here?
Renderer.Catalog.catalogCategories.add(new SshKeyCategory());
Main.Catalog.catalogCategories.add(new SshKeyCategory());
