import React from 'react';
import { Common, Renderer } from '@k8slens/extensions';
import { SshKeyEntity } from '../catalog/SshKeyEntity';
import { CredentialEntity } from '../catalog/CredentialEntity';
import { ProxyEntity } from '../catalog/ProxyEntity';
import { LicenseEntity } from '../catalog/LicenseEntity';
import * as strings from '../strings';

// NOTE: The following interface _should_ be exported by the Lens extension package
//  as `Common.Types.CatalogEntityDetailsProps`, but it's not, which is a known bug
//  that will hopefully be fixed "soon". In the meantime, we define it ourselves here.
interface CatalogEntityDetailsProps<T extends Common.Catalog.CatalogEntity> {
  entity: T;
}

const {
  Component: { DrawerTitle, DrawerItem },
} = Renderer;

const {
  catalog: {
    entities: {
      common: { details: unknownValue },
    },
  },
} = strings;

const catalogEntityDetails = [
  {
    kind: SshKeyEntity.kind,
    apiVersions: [SshKeyEntity.apiVersion],
    components: {
      Details: (props: CatalogEntityDetailsProps<SshKeyEntity>) => (
        <>
          <DrawerTitle
            title={strings.catalog.entities.common.details.title()}
          />
          <DrawerItem
            name={strings.catalog.entities.common.details.props.uid()}
          >
            {props.entity.metadata.uid || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.sshKey.details.props.dateCreated()}
          >
            {props.entity.spec.created || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.sshKey.details.props.publicKey()}
          >
            {props.entity.spec.publicKey || unknownValue()}
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
            title={strings.catalog.entities.common.details.title()}
          />
          <DrawerItem
            name={strings.catalog.entities.common.details.props.uid()}
          >
            {props.entity.metadata.uid || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.credential.details.props.provider()}
          >
            {props.entity.spec.provider || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.credential.details.props.region()}
          >
            {props.entity.spec.region || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.credential.details.props.mccStatus()}
          >
            {props.entity.spec.status || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.credential.details.props.dateCreated()}
          >
            {props.entity.spec.created || unknownValue()}
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
            title={strings.catalog.entities.common.details.title()}
          />
          <DrawerItem
            name={strings.catalog.entities.common.details.props.uid()}
          >
            {props.entity.metadata.uid || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.proxy.details.props.region()}
          >
            {props.entity.spec.region || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.proxy.details.props.httpProxy()}
          >
            {props.entity.spec.httpProxy || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.proxy.details.props.httpsProxy()}
          >
            {props.entity.spec.httpsProxy || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.proxy.details.props.dateCreated()}
          >
            {props.entity.spec.created || unknownValue()}
          </DrawerItem>
        </>
      ),
    },
  },
  {
    kind: LicenseEntity.kind,
    apiVersions: [LicenseEntity.apiVersion],
    components: {
      Details: (props: CatalogEntityDetailsProps<LicenseEntity>) => (
        <>
          <DrawerTitle
            title={strings.catalog.entities.common.details.title()}
          />
          <DrawerItem
            name={strings.catalog.entities.common.details.props.uid()}
          >
            {props.entity.metadata.uid || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.catalog.entities.license.details.props.dateCreated()}
          >
            {props.entity.spec.created || unknownValue()}
          </DrawerItem>
        </>
      ),
    },
  },
];

export default catalogEntityDetails;
