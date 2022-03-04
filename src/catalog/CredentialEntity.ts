//
// Credential Category and Entity
//

import { Common, Renderer, Main } from '@k8slens/extensions';
import * as rtv from 'rtvjs';
import { mergeRtvShapes } from '../util/mergeRtvShapes';
import { catalogEntityModelTs, requiredLabelTs } from './catalogEntities';
import {
  CatalogEntityMetadata,
  CatalogEntitySpec,
  CatalogEntityStatus,
} from './catalogEntityTypes';
import * as consts from '../constants';
import * as strings from '../strings';
import { logger as loggerUtil } from '../util/logger';
import { apiCredentialProviders } from '../api/apiConstants';

type CatalogEntityContextMenuContext =
  Common.Catalog.CatalogEntityContextMenuContext;
type CatalogEntityActionContext = Common.Catalog.CatalogEntityActionContext;

const logger: any = loggerUtil; // get around TS compiler's complaining

/** Map of phase name to phase value as understood by Lens. */
export const credentialEntityPhases = Object.freeze({
  AVAILABLE: 'available',
});

/**
 * Typeset for an object used to create a new instance of a `./catalog/CredentialEntity`
 *  object that gets added to the Lens Catalog. Also describes the shape of the entity
 *  object we get from iterating "entities" of this type in the Catalog.
 *
 * NOTE: As this is meant for Lens to consume, it will NOT MATCH the kube spec object
 *  retrieved from the MCC API for the same object.
 */
export const credentialEntityModelTs = mergeRtvShapes(
  {},
  catalogEntityModelTs,
  {
    metadata: {
      labels: requiredLabelTs,
    },
    spec: {
      provider: [
        rtv.OPTIONAL,
        rtv.STRING,
        {
          oneOf: Object.values(apiCredentialProviders),
        },
      ],
      region: [rtv.OPTIONAL, rtv.STRING],
      valid: rtv.BOOLEAN,
    },
    status: {
      phase: [rtv.STRING, { oneOf: Object.values(credentialEntityPhases) }],
    },
  }
);

export interface CredentialSpec extends CatalogEntitySpec {
  provider?: string;
  region?: string;
  valid: boolean;
}

export const credentialIconName = 'verified_user'; // must be a Material Icon name

export class CredentialEntity extends Common.Catalog.CatalogEntity<
  CatalogEntityMetadata,
  CatalogEntityStatus,
  CredentialSpec
> {
  public static readonly apiVersion = `${consts.catalog.entities.credential.group}/${consts.catalog.entities.credential.versions.v1alpha1}`;

  public static readonly kind = consts.catalog.entities.credential.kind;

  public readonly apiVersion = CredentialEntity.apiVersion;

  public readonly kind = CredentialEntity.kind;

  constructor(
    data: Common.Catalog.CatalogEntity<
      CatalogEntityMetadata,
      CatalogEntityStatus,
      CredentialSpec
    >
  ) {
    super(data);

    if (DEV_ENV) {
      // NOTE: something (probably IPC) sometimes swallows this exception and code
      //  execution silently stops without any log out from this exception, so check
      //  and log before throwing
      const result = rtv.check(
        { credentialEntityData: data },
        { credentialEntityData: credentialEntityModelTs }
      );
      if (!result.valid) {
        logger.error('CredentialEntity.constructor()', result.message, data);
        throw result;
      }
    }
  }

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
        title: `(WIP) ${strings.catalog.entities.common.contextMenu.browserOpen.title()}`,
        icon: 'launch', // NOTE: must be a string; cannot be a component that renders an icon
        onClick: async () => {
          logger.log(
            'CredentialEntity/CredentialEntity.onContextMenuOpen.browserOpen',
            'opening Credential %s in browser...',
            this.metadata.name
          );
        },
      });
    }

    // emit an event via the category so that other code (and extensions, for example)
    //  can add listeners to these events and add there own entries
    const category =
      Renderer.Catalog.catalogCategories.getCategoryForEntity<CredentialCategory>(
        this
      );
    category?.emit('contextMenuOpen', this, context);
  }
}

export class CredentialCategory extends Common.Catalog.CatalogCategory {
  public readonly apiVersion = `${consts.catalog.category.group}/${consts.catalog.category.versions.v1alpha1}`;

  public readonly kind = consts.catalog.category.kind;

  public metadata = {
    name: strings.catalog.entities.credential.categoryName(),
    icon: credentialIconName, // NOTE: must be a string; cannot be a component that renders an icon
  };

  public spec = {
    group: consts.catalog.entities.credential.group,
    versions: [
      {
        name: consts.catalog.entities.credential.versions.v1alpha1,
        entityClass: CredentialEntity,
      },
    ],
    names: {
      kind: CredentialEntity.kind,
    },
  };

  constructor() {
    super();

    // NOTE: this is the big blue contextual "+" button in the Catalog; items added
    //  here will be available from the button when this category is active in the
    //  Catalog
    // TODO: once we're ready to support creating this item type from Lens
    //  (this is for the big blue "+" button at the bottom/right corner of the Catalog)
    //  WILL NEED: `type CatalogEntityAddMenuContext = Common.Catalog.CatalogEntityAddMenuContext;`
    // this.on('catalogAddMenu', (ctx: CatalogEntityAddMenuContext) => {
    //   ctx.menuItems.push({
    //     icon: credentialIconName, // NOTE: must be a string; cannot be a component that renders an icon
    //     title: strings.catalog.entities.credential.catalogMenu.create.title(),
    //     onClick: async () => {
    //       logger.log(
    //         'CredentialEntity/CredentialCategory.onCatalogAddMenu.create',
    //         'Creating new Credential...'
    //       );
    //     },
    //   });
    // });
  }
}

// NOTE: Renderer and Main will only be defined on their respective "sides", but
//  this code must run on each side, so we have to test for existence for both
Renderer?.Catalog.catalogCategories.add(new CredentialCategory());
Main?.Catalog.catalogCategories.add(new CredentialCategory());
