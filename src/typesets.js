//
// RTV Typesets for runtime validations
//

import * as rtv from 'rtvjs';

/**
 * Describes a basic object used to create a new instance of an entity that will
 *  be added to the Lens Catalog.
 */
export const entityModelTs = {
  // based on Common.Types.CatalogEntityMetadata
  metadata: {
    uid: rtv.STRING,
    name: rtv.STRING,
    source: [rtv.OPTIONAL, rtv.STRING],
    description: [rtv.OPTIONAL, rtv.STRING],
    labels: [
      rtv.OPTIONAL,
      rtv.HASH_MAP,
      {
        $values: rtv.STRING,
      },
    ],

    //
    // CUSTOM PROPERTIES
    // can also contain any other custom properties as `name: value` pairs
    //

    // MCC namespace and instance URL to which this entity belongs
    namespace: rtv.STRING,
    cloudUrl: rtv.STRING,
  },
  // spec is specific to the type of entity being added; for a cluster, it requires
  //  `kubeconfigPath: string` and `kubeconfigContext: string`, but for an SshKeyEntity,
  //  it's `publicKey: string`
  spec: {},
  // all entities must have a status with a phase
  // based on Common.Types.CatalogEntityStatus
  status: {
    phase: rtv.STRING, // values are specific to the entity
    reason: [rtv.OPTIONAL, rtv.STRING],
    enabled: [rtv.OPTIONAL, rtv.BOOLEAN], // true, by default
    message: [rtv.OPTIONAL, rtv.STRING],
    active: [rtv.OPTIONAL, rtv.BOOLEAN],
  },
};

/**
 * Describes an object used to create a new instance of a `Common.Catalog.KubernetesCluster`
 *  object that gets added to the Lens Catalog. Also describes the shape of the entity
 *  object we get from iterating "entities" of this type in the Catalog.
 */
export const clusterModelTs = {
  metadata: {
    ...entityModelTs.metadata,
  },
  spec: {
    ...entityModelTs.spec,

    kubeconfigPath: rtv.STRING, // absolute path
    kubeconfigContext: rtv.STRING,
  },
  status: {
    ...entityModelTs.status,

    // override phase with a more specific typeset
    phase: [
      rtv.STRING,
      { oneOf: ['connecting', 'connected', 'disconnecting', 'disconnected'] },
    ],
  },
};

/**
 * Describes an object used to create a new instance of a `./catalog/SshKeyEntity`
 *  object that gets added to the Lens Catalog. Also describes the shape of the entity
 *  object we get from iterating "entities" of this type in the Catalog.
 */
export const sshKeyModelTs = {
  metadata: {
    ...entityModelTs.metadata,
  },
  spec: {
    ...entityModelTs.spec,

    publicKey: rtv.STRING,
  },
  status: {
    ...entityModelTs.status,

    // override phase with a more specific typeset
    phase: [rtv.STRING, { oneOf: ['available'] }],
  },
};

/**
 * Describes an object used to create a new instance of a `./catalog/CredentialEntity`
 *  object that gets added to the Lens Catalog. Also describes the shape of the entity
 *  object we get from iterating "entities" of this type in the Catalog.
 */
export const credentialModelTs = {
  metadata: {
    ...entityModelTs.metadata,
  },
  spec: {
    ...entityModelTs.spec,

    provider: [rtv.STRING, { oneOf: ['aws', 'openstack', 'equinix', 'azure'] }],
    status: {
      valid: rtv.BOOLEAN,
    },
  },
  status: {
    ...entityModelTs.status,

    // override phase with a more specific typeset
    phase: [rtv.STRING, { oneOf: ['available'] }],
  },
};

/**
 * Describes an object used to create a new instance of a `./catalog/ProxyEntity`
 *  object that gets added to the Lens Catalog. Also describes the shape of the entity
 *  object we get from iterating "entities" of this type in the Catalog.
 */
export const proxyModelTs = {
  metadata: {
    ...entityModelTs.metadata,
  },
  spec: {
    ...entityModelTs.spec,

    region: rtv.STRING,
    http: rtv.STRING,
    https: rtv.STRING,
  },
  status: {
    ...entityModelTs.status,

    // override phase with a more specific typeset
    phase: [rtv.STRING, { oneOf: ['available'] }],
  },
};
