import {
  Common,
  Renderer,
  Main,
} from '@k8slens/extensions';
import * as consts from '../constants';
import { logger as loggerUtil } from '../util/logger';
// DEBUG TODO: import { WeblinkStore } from '../weblink-store';

type CatalogEntityAddMenuContext = Common.Catalog.CatalogEntityAddMenuContext;
type CatalogEntityContextMenuContext = Common.Catalog.CatalogEntityContextMenuContext;
type CatalogEntityMetadata = Common.Catalog.CatalogEntityMetadata;
type CatalogEntityStatus = Common.Catalog.CatalogEntityStatus;
type CatalogEntityActionContext = Common.Catalog.CatalogEntityActionContext;

const logger: any = loggerUtil; // get around TS compiler's complaining

export type SshKeyStatusPhase = 'available' | 'unavailable';

export interface SshKeyStatus extends CatalogEntityStatus {
  phase: SshKeyStatusPhase;
}

export type SshKeySpec = {
  publicKey: string;
};

export class SshKeyEntity extends Common.Catalog.CatalogEntity<
  CatalogEntityMetadata,
  SshKeyStatus,
  SshKeySpec
> {
  public static readonly apiVersion = `${consts.catalog.entities.sshKey.group}/${consts.catalog.entities.sshKey.versions.v1alpha1}`;
  public static readonly kind = consts.catalog.entities.sshKey.kind;

  public readonly apiVersion = SshKeyEntity.apiVersion;
  public readonly kind = SshKeyEntity.kind;

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

    // emit an event via the category so that other code (and extensions, for example)
    //  can add listeners to these events and add there own entries
    const category = Renderer.Catalog.catalogCategories
      .getCategoryForEntity<SshKeyCategory>(this);
    category?.emit('contextMenuOpen', this, context);
  }
}

export class SshKeyCategory extends Common.Catalog.CatalogCategory {
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
  // Lens team's answer:
  //  This is a optional static field of type function that takes no args and produces void.
  //  This was used in for weblinks because of the decision to have the same class be used both
  //  on renderer and main but the onAdd code is only applicable on renderer so we initialize
  //  this static field to a function there.
  public static onAdd?: () => void;

  constructor() {
    super();

    // DEBUG NOTE: this must be the big blue "+" button
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

// NOTE: Renderer and Main will only be defined on their respective "sides", but
//  this code must run on each side, so we have to test for existence for both
Renderer?.Catalog.catalogCategories.add(new SshKeyCategory());
Main?.Catalog.catalogCategories.add(new SshKeyCategory());
