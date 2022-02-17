//
// RTV Typesets for runtime validations
//

import * as rtv from 'rtvjs';

/**
 * Typeset for a basic object used to create a new instance of an entity that will
 *  be added to the Lens Catalog.
 */
export const catalogEntityModelTs = {
  // based on Lens Common.Types.CatalogEntityMetadata
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

  // spec is specific to the type of entity being added to the Catalog; e.g. for a cluster,
  //  it requires `kubeconfigPath: string` and `kubeconfigContext: string`, but for an
  //  SSH key, it requires `publicKey: string`...
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

export const clusterEntityPhases = Object.freeze({
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTING: 'disconnecting',
  DISCONNECTED: 'disconnected',
});

/**
 * Typeset for an object used to create a new instance of a `Common.Catalog.KubernetesCluster`
 *  object that gets added to the Lens Catalog. Also describes the shape of the entity
 *  object we get from iterating "entities" of this type in the Catalog.
 */
export const clusterEntityModelTs = {
  metadata: {
    ...catalogEntityModelTs.metadata,
  },
  spec: {
    ...catalogEntityModelTs.spec,

    kubeconfigPath: rtv.STRING, // absolute path
    kubeconfigContext: rtv.STRING,
  },
  status: {
    ...catalogEntityModelTs.status,

    // override phase with a more specific typeset
    phase: [rtv.STRING, { oneOf: Object.values(clusterEntityPhases) }],
  },
};

/**
 * Typeset for an object used to create a new instance of a `./catalog/SshKeyEntity`
 *  object that gets added to the Lens Catalog. Also describes the shape of the entity
 *  object we get from iterating "entities" of this type in the Catalog.
 */
export const sshKeyEntityModelTs = {
  metadata: {
    ...catalogEntityModelTs.metadata,
  },
  spec: {
    ...catalogEntityModelTs.spec,

    publicKey: rtv.STRING,
  },
  status: {
    ...catalogEntityModelTs.status,

    // override phase with a more specific typeset
    phase: [rtv.STRING, { oneOf: ['available'] }],
  },
};

/**
 * Typeset for an object used to create a new instance of a `./catalog/CredentialEntity`
 *  object that gets added to the Lens Catalog. Also describes the shape of the entity
 *  object we get from iterating "entities" of this type in the Catalog.
 */
export const credentialEntityModelTs = {
  metadata: {
    ...catalogEntityModelTs.metadata,
  },
  spec: {
    ...catalogEntityModelTs.spec,

    provider: [
      rtv.STRING,
      {
        oneOf: ['aws', 'openstack', 'equinix', 'azure', 'vsphere', 'byo', 'bm'],
      },
    ],
    status: {
      valid: rtv.BOOLEAN,
    },
  },
  status: {
    ...catalogEntityModelTs.status,

    // override phase with a more specific typeset
    phase: [rtv.STRING, { oneOf: ['available'] }],
  },
};

/**
 * Typeset for an object used to create a new instance of a `./catalog/ProxyEntity`
 *  object that gets added to the Lens Catalog. Also describes the shape of the entity
 *  object we get from iterating "entities" of this type in the Catalog.
 */
export const proxyEntityModelTs = {
  metadata: {
    ...catalogEntityModelTs.metadata,
  },
  spec: {
    ...catalogEntityModelTs.spec,

    region: rtv.STRING,
    http: rtv.STRING,
    https: rtv.STRING,
  },
  status: {
    ...catalogEntityModelTs.status,

    // override phase with a more specific typeset
    phase: [rtv.STRING, { oneOf: ['available'] }],
  },
};
