//
// Generic things related to Catalog Entities in Lens
//

import * as rtv from 'rtvjs';
import * as consts from '../constants';
import { logger, logString } from '../util/logger';
import { mergeRtvShapes } from '../util/mergeRtvShapes';
import { apiKinds, apiCredentialKinds } from '../api/apiConstants';

/**
 * Typeset representing the required labels for all entity types (except a mgmt
 *  cluster itself).
 */
export const requiredLabelTs = {
  managementCluster: rtv.STRING,
  project: rtv.STRING,
};

/**
 * Typeset for a required value from the apiKinds enumeration.
 */
export const apiKindTs = [rtv.STRING, { oneOf: Object.values(apiKinds) }];

/**
 * Typeset for a basic object used to create a new instance of an entity that will
 *  be added to the Lens Catalog.
 */
export const catalogEntityModelTs = {
  // based on Lens Common.Types.CatalogEntityMetadata
  metadata: {
    uid: rtv.STRING,
    name: rtv.STRING,
    source: [rtv.STRING, { oneOf: consts.catalog.source }],
    description: [rtv.OPTIONAL, rtv.STRING],
    labels: [
      rtv.OPTIONAL,
      rtv.HASH_MAP,
      {
        $values: rtv.STRING,
      },
    ],

    //// CUSTOM PROPERTIES
    // can also contain any other custom properties as `name: value` pairs

    kind: apiKindTs,

    // enough info to relate this entity to a namespace in a Cloud in `CloudStore.clouds`
    //  if necessary
    namespace: rtv.STRING,
    cloudUrl: [rtv.STRING, (v) => !v.endsWith('/')], // no trailing slash
  },

  // spec is specific to the type of entity being added to the Catalog; e.g. for a cluster,
  //  it requires `kubeconfigPath: string` and `kubeconfigContext: string`, but for an
  //  SSH key, it requires `publicKey: string`...
  spec: {
    // ISO-8601 timestamp (e.g. 2022-03-04T21:33:27.716Z), milliseconds are optional
    //  (MCC API doesn't return milliseconds, so we don't always expect them)
    createdAt: [
      rtv.STRING,
      { exp: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?Z$' },
    ],
  },

  // all entities must have a status with a phase
  // based on Common.Types.CatalogEntityStatus
  status: {
    // NOTE: this is __LENS__ status, not MCC status
    phase: rtv.STRING, // values are specific to the entity
    reason: [rtv.OPTIONAL, rtv.STRING],
    enabled: [rtv.OPTIONAL, rtv.BOOLEAN], // true, by default
    message: [rtv.OPTIONAL, rtv.STRING],
    active: [rtv.OPTIONAL, rtv.BOOLEAN],
  },
};

/** Map of phase name to phase value as understood by Lens. */
export const clusterEntityPhases = Object.freeze({
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DELETING: 'deleting',
  DISCONNECTING: 'disconnecting',
  DISCONNECTED: 'disconnected',
});

/**
 * Typeset for an object used to create a new instance of a Lens `Common.Catalog.KubernetesCluster`
 *  object that gets added to the Lens Catalog. Also describes the shape of the entity
 *  object we get from iterating "entities" of this type in the Catalog.
 *
 * NOTE: As this is meant for Lens to consume, it will NOT MATCH the kube spec object
 *  retrieved from the MCC API for the same object.
 *
 * @see node_modules/@k8slens/extensions/dist/src/common/catalog-entities/kubernetes-cluster.d.ts
 */
export const clusterEntityModelTs = mergeRtvShapes({}, catalogEntityModelTs, {
  // based on Lens `KubernetesClusterMetadata` type
  metadata: {
    distro: [rtv.OPTIONAL, rtv.STRING],
    kubeVersion: [rtv.OPTIONAL, rtv.STRING],

    //// CUSTOM PROPERTIES

    labels: [
      // either it's a mgmt cluster and we no labels
      rtv.HASH_MAP,
      { length: 0 },

      // or it's a child cluster and we have specific labels
      rtv.PLAIN_OBJECT,
      {
        $: {
          ...requiredLabelTs,
          sshKey: [rtv.OPTIONAL, rtv.STRING, (value) => !!value], // either no label, or non-empty string
          credential: [rtv.OPTIONAL, rtv.STRING, (value) => !!value], // either no label, or non-empty string
          proxy: [rtv.OPTIONAL, rtv.STRING, (value) => !!value], // either no label, or non-empty string
          license: [rtv.OPTIONAL, rtv.STRING, (value) => !!value], // either no label, or non-empty string
        },
      },

      // custom validator (called as long as at least one of the previous types
      //  is a match) reinforces the mgmt cluster check based on the actual
      //  properties of the entity being validated
      (value, match, ts, { originalValue: entity, parent }) => {
        if (entity.spec.isManagementCluster) {
          if (Object.keys(parent.labels).length > 0) {
            // mgmt cluster has no labels at this time
            throw new Error(
              `Unexpected labels for management cluster: [${Object.keys(
                parent.labels
              ).join(', ')}]`
            );
          }
        }
      },
    ],
  },

  // based on Lens `KubernetesClusterSpec` type
  spec: {
    kubeconfigPath: rtv.STRING, // absolute path
    kubeconfigContext: rtv.STRING,
    icon: [
      rtv.OPTIONAL,
      {
        src: [rtv.OPTIONAL, rtv.STRING],
        material: [rtv.OPTIONAL, rtv.STRING],
        background: [rtv.OPTIONAL, rtv.STRING],
      },
    ],

    //// CUSTOM PROPERTIES

    isManagementCluster: rtv.BOOLEAN,
    ready: rtv.BOOLEAN,
  },

  // based on Lens `KubernetesClusterStatus` type
  status: {
    phase: [rtv.STRING, { oneOf: Object.values(clusterEntityPhases) }],
  },
});

/**
 * Generate URL for single entity.
 * @param {object} entity Single entity.
 */
export const generateEntityUrl = (entity) => {
  const url = `${entity.metadata.cloudUrl}/projects/${entity.metadata.namespace}`;

  if (Object.values(apiCredentialKinds).includes(entity.metadata.kind)) {
    return `${url}/creds?name=${entity.metadata.name}`;
  }

  switch (entity.metadata.kind) {
    case apiKinds.RHEL_LICENSE:
      return `${url}/rhel?name=${entity.metadata.name}`;
    case apiKinds.PROXY:
      return `${url}/proxies?name=${entity.metadata.name}`;
    case apiKinds.PUBLIC_KEY:
      return `${url}/keypairs?name=${entity.metadata.name}`;
    case apiKinds.CLUSTER:
      return `${url}/clusters/${entity.metadata.name}`;
    default:
      logger.error(
        'catalogEntities.generateEntityUrl()',
        `Unknown entity kind=${logString(entity.metadata.kind)}`
      );
      return url;
  }
};
