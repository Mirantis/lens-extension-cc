//
// Generic things related to Catalog Entities in Lens
//

import path from 'path';
import * as rtv from 'rtvjs';
import { Common } from '@k8slens/extensions';
import * as consts from '../constants';
import { logger, logValue } from '../util/logger';
import { mergeRtvShapes } from '../util/mergeRtvShapes';
import { apiKinds, apiCredentialKinds } from '../api/apiConstants';

const {
  Catalog: { CatalogEntity },
} = Common;

/**
 * Name of the sub directory in the Lens-designated "extension storage" directory
 *  where kubeConfig files are written.
 * @type {string}
 */
export const KUBECONFIG_DIR_NAME = 'kubeconfigs';

/** Label names for various entity types. */
export const entityLabels = Object.freeze({
  /** Management cluster's name (name assigned to Cloud by user when adding it). */
  CLOUD: 'mgmt-cluster',
  /** Resource's namespace name. */
  NAMESPACE: 'project',
  /** Identifies clusters that are management clusters. Value should always be "true". */
  IS_MGMT_CLUSTER: 'is-mgmt-cluster',
  /** Associated SSH key name(s), if any. */
  SSH_KEY: 'ssh-key',
  /** Associated Credential name, if any. */
  CREDENTIAL: 'credential',
  /** Associated Proxy name, if any. */
  PROXY: 'proxy',
  /** Associated License name, if any. */
  LICENSE: 'license',
});

/**
 * Typeset representing the required labels for all entity types.
 */
export const requiredLabelsTs = {
  [entityLabels.CLOUD]: rtv.STRING,
  [entityLabels.NAMESPACE]: rtv.STRING,
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
    resourceVersion: rtv.STRING,

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

/**
 * Map of phase name to LENS phase value (related to Lens' connection status with the cluster).
 */
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
      // either it's a mgmt cluster and we have no labels
      rtv.HASH_MAP,
      { length: 0 },

      // or it's a child cluster and we have specific labels
      rtv.PLAIN_OBJECT,
      {
        $: {
          ...requiredLabelsTs,
          [entityLabels.IS_MGMT_CLUSTER]: [
            rtv.OPTIONAL,
            rtv.STRING,
            { oneOf: 'true' },
          ], // either no label, or "true"
          [entityLabels.SSH_KEY]: [
            rtv.OPTIONAL,
            rtv.STRING,
            (value) => value !== '',
          ], // either no label, or non-empty string
          [entityLabels.CREDENTIAL]: [
            rtv.OPTIONAL,
            rtv.STRING,
            (value) => value !== '',
          ], // either no label, or non-empty string
          [entityLabels.PROXY]: [
            rtv.OPTIONAL,
            rtv.STRING,
            (value) => value !== '',
          ], // either no label, or non-empty string
          [entityLabels.LICENSE]: [
            rtv.OPTIONAL,
            rtv.STRING,
            (value) => value !== '',
          ], // either no label, or non-empty string
        },
      },
    ],
  },

  // based on Lens `KubernetesClusterSpec` type
  spec: {
    // absolute path that includes a directory named `KUBECONFIG_DIR_NAME` taking into account
    kubeconfigPath: [
      rtv.STRING,
      (v) => !!v.match(new RegExp(`(\\/|\\\\)${KUBECONFIG_DIR_NAME}\\1`)),
    ],

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

    isMgmtCluster: rtv.BOOLEAN,
    ready: rtv.BOOLEAN,
    apiStatus: rtv.STRING,
    controllerCount: rtv.SAFE_INT,
    workerCount: rtv.SAFE_INT,
    region: rtv.STRING,
    provider: rtv.STRING,
    currentVersion: rtv.STRING,
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
    return `${url}/creds?name=${entity.metadata.name}&details`;
  }

  switch (entity.metadata.kind) {
    case apiKinds.RHEL_LICENSE:
      return `${url}/rhel?name=${entity.metadata.name}&details`;
    case apiKinds.PROXY:
      return `${url}/proxies?name=${entity.metadata.name}&details`;
    case apiKinds.PUBLIC_KEY:
      return `${url}/keypairs?name=${entity.metadata.name}&details`;
    case apiKinds.CLUSTER:
      return `${url}/clusters/${entity.metadata.name}`;
    default:
      logger.error(
        'catalogEntities.generateEntityUrl()',
        `Unknown entity kind=${logValue(
          entity.metadata.kind
        )}: Falling back to namespace URL`
      );
      return url;
  }
};

/**
 * @private
 * Converts a Catalog Entity Model OR a CatalogEntity to a string for logging purposes.
 * @param {CatalogEntity|Object} item
 * @returns {string} String representation for a log entry.
 */
const _itemToString = function (item) {
  const type = item instanceof CatalogEntity ? 'Entity' : 'Model';

  let other = '';
  if (item.metadata.kind === apiKinds.CLUSTER) {
    const match = item.spec.kubeconfigPath?.match(
      new RegExp(`(\\/|\\\\)${KUBECONFIG_DIR_NAME}\\1`)
    );
    if (match) {
      other = logValue(
        `...${path.sep}${match.input.slice(match.index + match[0].length)}`
      );
    } else {
      other = logValue(item.spec.kubeconfigPath);
    }
    other = `, kubeconfigPath=${other}`;
  }

  return `{{${type} kind=${item.metadata.kind}, name=${logValue(
    item.metadata.name
  )}, uid=${logValue(item.metadata.uid)}, cloudUrl=${logValue(
    item.metadata.cloudUrl
  )}${other}}}`;
};

/**
 * Converts a Catalog Entity Model to a string for logging purposes.
 * @param {Object} model
 * @returns {string} String representation for a log entry.
 */
export const modelToString = function (model) {
  DEV_ENV && rtv.verify({ model }, { model: catalogEntityModelTs });
  return _itemToString(model);
};

/**
 * Converts a Catalog Entity to a string for logging purposes.
 * @param {CatalogEntity} entity
 * @returns {string} String representation for a log entry.
 */
export const entityToString = function (entity) {
  if (!(entity instanceof CatalogEntity)) {
    throw new Error('entity must be an instance of CatalogEntity');
  }
  return _itemToString(entity);
};

/**
 * Finds a Catalog Entity in a list of entities that matches a given Model.
 * @param {Array} list
 * @param {Object} model Catalog Entity Model.
 * @returns {CatalogEntity|undefined} The Catalog Entity that matches; `undefined` if none.
 */
export const findEntity = function (list, model) {
  // UID is enough for now because MCC doesn't have a concept of an actual "shared"
  //  resource across namespaces; if we get multiple entities in the Catalog with
  //  the same name, that's because someone created a resource with the same name
  //  in multiple synced namespaces; they'll all have their own UIDs; users can
  //  use the Catalog's search feature to filter on namespace
  return list.find((entity) => model.metadata.uid === entity.metadata.uid);
};
