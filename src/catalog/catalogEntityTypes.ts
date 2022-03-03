//
// Typings for Catalog Entity Types
//

import { Common } from '@k8slens/extensions';

type LensCatalogEntityMetadata = Common.Catalog.CatalogEntityMetadata;
type LensCatalogEntityStatus = Common.Catalog.CatalogEntityStatus;

export interface CatalogEntityMetadata extends LensCatalogEntityMetadata {
  kind: string;
  namespace: string;
  cloudUrl: string;
}

export interface CatalogEntitySpec {
  createdAt: string;
}

export interface CatalogEntityStatus extends LensCatalogEntityStatus {}
