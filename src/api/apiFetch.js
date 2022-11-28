//
// Functions for fetching various kinds of API resources
//

import * as rtv from 'rtvjs';
import { filter } from 'lodash';
import { cloudRequest, extractJwtPayload } from '../api/apiUtil';
import { Namespace, namespaceTs } from '../api/types/Namespace';
import { Credential, credentialTs } from '../api/types/Credential';
import { SshKey, sshKeyTs } from '../api/types/SshKey';
import { Cluster, clusterTs } from '../api/types/Cluster';
import { Machine, machineTs } from '../api/types/Machine';
import { Proxy, proxyTs } from '../api/types/Proxy';
import { License, licenseTs } from '../api/types/License';
import { resourceEventTs } from '../api/types/ResourceEvent';
import { ClusterEvent, clusterEventTs } from '../api/types/ClusterEvent';
import { MachineEvent, machineEventTs } from './types/MachineEvent';
import { resourceUpdateTs } from './types/ResourceUpdate';
import {
  ClusterDeployment,
  clusterDeploymentTs,
} from './types/ClusterDeployment';
import { ClusterUpgrade, clusterUpgradeTs } from './types/ClusterUpgrade';
import {
  MachineDeployment,
  machineDeploymentTs,
} from './types/MachineDeployment';
import { MachineUpgrade, machineUpgradeTs } from './types/MachineUpgrade';
import { logger, logValue } from '../util/logger';
import {
  apiResourceTypes,
  apiCredentialTypes,
  apiNamespacePhases,
  apiKinds,
  apiUpdateTypes,
} from '../api/apiConstants';

/**
 * Deserialize a raw list of API resources into `Resource` instances.
 * @param {string} resourceType API resourceType name to fetch from the `apiConstants.apiResourceTypes` enum.
 * @param {Object} body Data response from `/list/{resourceType}` API.
 * @param {Namespace} [namespace] The related Namespace; `undefined` if fetching
 *  namespaces themselves (i.e. `resourceType === apiResourceTypes.NAMESPACE`).
 * @param {(params: { data: Object, namespace?: Namespace }) => Resource|undefined} params.create
 *  Function called to create new instance of an `Resource`-based class that represents the API
 *  resourceType. If a falsy value is returned, it will be silently filtered out of the resulting
 *  list of resources.
 *  - `data` is the raw object returned from the API for the resourceType.
 *  - `namespace` is the related Namespace (`undefined` when fetching namespaces themselves
 *      with `resourceType === apiResourceTypes.NAMESPACE`).
 *  - Returns: The resource, or a falsy value to filter it out (skip).
 * @returns {Array<Resource>} Array of API objects. Empty list if none. Any
 *  item that can't be deserialized is ignored and not returned in the list.
 */
const _deserializeCollection = function (
  resourceType,
  body,
  namespace,
  create
) {
  if (!body || !Array.isArray(body.items)) {
    logger.error(
      'apiFetch._deserializeCollection()',
      `Failed to parse "${resourceType}" collection payload: Unexpected data format`
    );
    return [];
  }

  return body.items
    .map((data, idx) => {
      try {
        return create({ data, namespace });
      } catch (err) {
        logger.warn(
          'apiFetch._deserializeCollection()',
          `Ignoring ${logValue(
            resourceType
          )} resource index=${idx}: Could not be deserialized; name=${logValue(
            data?.metadata?.name
          )}; namespace=${logValue(namespace.name)}; error=${logValue(err)}`,
          err
        );
        return undefined;
      }
    })
    .filter((obj) => !!obj);
};

/**
 * [ASYNC] Best-try to get all existing resources of a given type from the management cluster,
 *  for each namespace specified.
 * @param {Object} params
 * @param {string} params.resourceType API resource type to fetch (one of
 *  `apiConstants.apiResourceTypes` enum values).
 * @param {Cloud} params.cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} [params.namespaces] List of namespaces in which to get the resources.
 *  __REQUIRED__ unless `resourceType === apiResourceTypes.NAMESPACE`, in which case this parameter is
 *  ignored because we're fetching the namespaces themselves.
 * @param {(params: { data: Object, namespace?: Namespace }) => Resource} params.create
 *  Function called to create new instance of an `Resource`-based class that represents the API
 *  resourceType. If a falsy value is returned, it will be silently filtered out of the resulting
 *  list of resources.
 *  - `data` is the raw object returned from the API for the resourceType.
 *  - `namespace` is the related Namespace (`undefined` when fetching namespaces themselves
 *      with `resourceType === apiResourceTypes.NAMESPACE`).
 *  - Returns: The resource, or a falsy value to filter it out (skip).
 * @param {Object} [params.args] Custom arguments to provide to the `args` param of `cloudRequest()`.
 *
 *  NOTE: `namespaceName` arg, if specified, will be overwritten by the namespace whose resources
 *   are being fetched.
 *
 * @returns {Promise<{
 *   resources: { [index: string]: Array<Resource> },
 *   tokensRefreshed: boolean,
 *   errors?: { [index: string]: { message: string, status: number, resourceType: string } }
 * }>} Always resolves, never fails.
 *
 *  - `resources` is a map of namespace name to list of `Resource`-based instances as returned
 *      by `create()`. If an error occurs trying to get an resourceType or deserialize
 *      it, it is ignored/skipped.
 *  - `tokensRefreshed` is true if the Cloud's API access tokens had to be refreshed while getting
 *      the `resources`.
 *  - `errors` is defined if a at least one error occurred while fetching a collection, and is a
 *      map of namespace name to error object.
 *
 *  NOTE: If `resourceType === apiResourceTypes.NAMESPACE` (i.e. fetching namespaces themselves),
 *   `resources` and `errors` are maps with a single key which is the `apiResourceTypes.NAMESPACE`
 *   type mapped to resources and errors, respectively.
 */
const _fetchCollection = async function ({
  resourceType,
  cloud,
  namespaces,
  create,
  args,
}) {
  DEV_ENV &&
    rtv.verify(
      { resourceType, namespaces },
      {
        resourceType: [rtv.STRING, { oneOf: Object.values(apiResourceTypes) }],
        namespaces: [rtv.OPTIONAL, [rtv.CLASS_OBJECT, { ctor: Namespace }]],
      }
    );

  if (!cloud.config.isResourceAvailable(resourceType)) {
    logger.log(
      'apiFetch._fetchCollection',
      `Cannot fetch resources of type ${logValue(
        resourceType
      )}: Not available; cloud=${logValue(cloud.cloudUrl)}`
    );
    return { resources: {}, tokensRefreshed: false };
  }

  let tokensRefreshed = false;

  // process a result from an API call
  // NOTE: `namespace` is `undefined` when fetching namespaces themselves
  const processResult = (
    { body, tokensRefreshed: refreshed, error, status },
    namespace
  ) => {
    tokensRefreshed = tokensRefreshed || refreshed;

    let items = [];
    if (error) {
      if (
        Object.values(apiUpdateTypes).includes(resourceType) &&
        status === 404
      ) {
        // cluster/machine deployment/upgrade status object endpoint will return 404 unless
        //  at least one of these types of procedures has taken place; e.g. if clusters in
        //  a namespace have never been upgraded, we'll get a 404 trying to get
        //  `CLUSTER_UPGRADE_STATUS` objects in that namespace
        logger.log(
          'apiFetch._fetchCollection',
          `(IGNORED: No history) Failed to get ${logValue(
            resourceType
          )} resources, namespace=${
            logValue(namespace?.name || namespace) // undefined if `resourceType === apiResourceTypes.NAMESPACE`
          }, status=${status}, error=${logValue(error)}`
        );
        error = undefined; // ignore
      } else {
        // if it's a 403 "access denied" issue, just log it but don't flag it
        //  as an error since there are various mechanisms that could prevent
        //  a user from accessing certain resources in the API (disabled components,
        //  permissions, etc.)
        logger[status === 403 ? 'log' : 'error'](
          'apiFetch._fetchCollection',
          `${
            status === 403 ? '(IGNORED: Access denied) ' : ''
          }Failed to get ${logValue(resourceType)} resources, namespace=${
            logValue(namespace?.name || namespace) // undefined if `resourceType === apiResourceTypes.NAMESPACE`
          }, status=${status}, error=${logValue(error)}`
        );
        if (status === 403) {
          error = undefined; // ignore
        }
      }
    } else {
      items = _deserializeCollection(resourceType, body, namespace, create);
    }

    return {
      items,
      namespace,
      resourceVersion: body?.metadata?.resourceVersion || null, // collection version
      error: error
        ? { message: logValue(error), status, resourceType }
        : undefined,
    };
  };

  let results;
  if (resourceType === apiResourceTypes.NAMESPACE) {
    const result = await cloudRequest({
      cloud,
      method: 'list',
      resourceType: apiResourceTypes.NAMESPACE,
      args,
    });

    results = [processResult(result)];
  } else {
    results = await Promise.all(
      namespaces.map(async (namespace) => {
        const result = await cloudRequest({
          cloud,
          method: 'list',
          resourceType,
          args: { ...args, namespaceName: namespace.name },
        });

        return processResult(result, namespace);
      })
    );
  }

  // NOTE: the loop above ensures that there are no error results; all items in
  //  `results` have the same shape

  const resources = {};
  let errors = {};
  if (resourceType === apiResourceTypes.NAMESPACE) {
    resources[apiResourceTypes.NAMESPACE] = results[0].items;
    if (results[0].error) {
      errors[apiResourceTypes.NAMESPACE] = results[0].error;
    }
  } else {
    results.forEach((result) => {
      const {
        namespace: { name: nsName },
        items,
        error,
      } = result;
      resources[nsName] = items;
      if (error) {
        errors[nsName] = error;
      }
    });
  }

  if (Object.keys(errors).length <= 0) {
    errors = undefined;
  }

  return { resources, tokensRefreshed, errors };
};

/**
 * Processes a list of results from multiple calls to `_fetchCollection()` which each
 *  returned objects the same shape and combines them into a single map of namespace
 *  name to resource list.
 * @param {Array<{ resources: Record<string, Resource>, tokensRefreshed: boolean, errors: Record<string, Error> }>}
 *  List of result objects to combine. `resources` and `errors` are maps of namespace name to values.
 * @param {string} [resourcesName] Name of the `resources` property in the returned object,
 *  for convenience.
 * @returns {{ resources: Record<string, Resource>, tokensRefreshed: boolean, errorsOccurred: boolean }}
 *  All resources combined into a single map of namespace name to resource object, and flags indicating
 *  whether Cloud tokens had to be refreshed and if errors occurred.
 */
const _zipFetchResults = function (results, resourcesName = 'resources') {
  // NOTE: `results` will be an array of `{ resources, tokensRefreshed, errors }` because
  //  of each resource type that was retrieved for each namespace
  // NOTE: _fetchCollection() ensures there are no error results (though errors may be
  //  reported in results); all items in `results` have the same shape

  let tokensRefreshed = false;
  let errorsOccurred = false;
  const resources = results.reduce((acc, result) => {
    const {
      resources: fetchedResources,
      tokensRefreshed: refreshed,
      errors,
    } = result;

    tokensRefreshed = tokensRefreshed || refreshed;
    errorsOccurred = errorsOccurred || !!errors;

    Object.keys(fetchedResources).forEach((nsName) => {
      const resourceList = fetchedResources[nsName];
      if (acc[nsName]) {
        acc[nsName] = [...acc[nsName], ...resourceList];
      } else {
        acc[nsName] = [...resourceList];
      }
    });

    return acc;
  }, {});

  return { [resourcesName]: resources, tokensRefreshed, errorsOccurred };
};

/**
 * [ASYNC] Best-try to get all existing resource events from the management cluster, for each
 *  namespace specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 * @returns {Promise<{
 *   resourceEvents: { [index: string]: Array<ResourceEvent> },
 *   tokensRefreshed: boolean,
 *   errorsOccurred: boolean,
 * }>} Always resolves, never fails.
 *
 *  - `resourceEvents` are mapped per namespace name. If an error occurs trying
 *      to get any object, it will be ignored/skipped.
 *  - `tokensRefreshed` is true if the cloud's tokens had to be refreshed during the process.
 *  - `errorsOccurred` is true if at least one error ocurred (that couldn't be safely ignored)
 *      while fetching resources.
 */
export const fetchResourceEvents = async function (cloud, namespaces) {
  const {
    resources: resourceEvents,
    tokensRefreshed,
    errors,
  } = await _fetchCollection({
    resourceType: apiResourceTypes.EVENT,
    cloud,
    namespaces,
    create: ({ data, namespace }) => {
      // first check if it's at least a valid generic resource event
      rtv.verify(data, resourceEventTs);

      if (data.involvedObject.kind === apiKinds.CLUSTER) {
        // now check if it's a valid cluster event
        const mvvData = rtv.verify(data, clusterEventTs).mvv;
        return new ClusterEvent({ data: mvvData, namespace, cloud });
      }

      if (data.involvedObject.kind === apiKinds.MACHINE) {
        // now check if it's a valid machine event
        const mvvData = rtv.verify(data, machineEventTs).mvv;
        return new MachineEvent({ data: mvvData, namespace, cloud });
      }

      // since it wasn't a cluster event, and those are the only ones we care
      //  about, ignore it
      return undefined;
    },
  });

  return { resourceEvents, tokensRefreshed, errorsOccurred: !!errors };
};

/**
 * [ASYNC] Best-try to get all existing update history objects from the management
 *  cluster, for each namespace specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 * @returns {Promise<{
 *   resourceUpdates: { [index: string]: Array<ResourceUpdate> },
 *   tokensRefreshed: boolean,
 *   errorsOccurred: boolean,
 * }>} Always resolves, never fails.
 *
 *  - `resourceUpdates` are mapped per namespace name. If an error occurs trying
 *      to get any object, it will be ignored/skipped. Note this includes __ALL updates__
 *      related to a cluster and its machines.
 *  - `tokensRefreshed` is true if the cloud's tokens had to be refreshed during the process.
 *  - `errorsOccurred` is true if at least one error ocurred (that couldn't be safely ignored)
 *      while fetching resources.
 */
export const fetchResourceUpdates = async function (cloud, namespaces) {
  const results = await Promise.all(
    [
      apiResourceTypes.CLUSTER_DEPLOYMENT_STATUS,
      apiResourceTypes.CLUSTER_UPGRADE_STATUS,
      apiResourceTypes.MACHINE_DEPLOYMENT_STATUS,
      apiResourceTypes.MACHINE_UPGRADE_STATUS,
    ].map((resourceType) =>
      _fetchCollection({
        resourceType,
        cloud,
        namespaces,
        create: ({ data, namespace }) => {
          // first check if it's at least a valid generic resource update
          rtv.verify(data, resourceUpdateTs);

          if (resourceType === apiResourceTypes.CLUSTER_DEPLOYMENT_STATUS) {
            // now check if it's a valid cluster deployment
            const mvvData = rtv.verify(data, clusterDeploymentTs).mvv;
            return new ClusterDeployment({ data: mvvData, namespace, cloud });
          }

          if (resourceType === apiResourceTypes.CLUSTER_UPGRADE_STATUS) {
            // now check if it's a valid cluster upgrade
            const mvvData = rtv.verify(data, clusterUpgradeTs).mvv;
            return new ClusterUpgrade({ data: mvvData, namespace, cloud });
          }

          if (resourceType === apiResourceTypes.MACHINE_DEPLOYMENT_STATUS) {
            // now check if it's a valid machine deployment
            const mvvData = rtv.verify(data, machineDeploymentTs).mvv;
            return new MachineDeployment({ data: mvvData, namespace, cloud });
          }

          // must be a valid machine upgrade
          const mvvData = rtv.verify(data, machineUpgradeTs).mvv;
          return new MachineUpgrade({ data: mvvData, namespace, cloud });
        },
      })
    )
  );

  return _zipFetchResults(results, 'resourceUpdates');
};

/**
 * [ASYNC] Best-try to get all existing Credentials from the management cluster, for each
 *  namespace specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 * @returns {Promise<{
 *   credentials: { [index: string]: Array<Credential> },
 *   tokensRefreshed: boolean,
 *   errorsOccurred: number,
 * }>} Always resolves, never fails.
 *
 *  - `credentials` is a map of namespace name to credential (regardless of type).
 *      If there's an error trying to get any credential, it will be skipped/ignored.
 *  - `tokensRefreshed` is true if the cloud's tokens had to be refreshed during the process.
 *  - `errorsOccurred` is true if at least one error ocurred (that couldn't be safely ignored)
 *      while fetching resources.
 */
export const fetchCredentials = async function (cloud, namespaces) {
  const results = await Promise.all(
    Object.values(apiCredentialTypes).map((resourceType) =>
      _fetchCollection({
        resourceType,
        cloud,
        namespaces,
        create: ({ data, namespace }) => {
          const mvvData = rtv.verify(data, credentialTs).mvv;
          return new Credential({ data: mvvData, namespace, cloud });
        },
      })
    )
  );

  return _zipFetchResults(results, 'credentials');
};

/**
 * [ASYNC] Best-try to get all existing licenses from the management cluster, for each
 *  namespace specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 * @returns {Promise<{
 *   licenses: { [index: string]: Array<License> },
 *   tokensRefreshed: boolean,
 *   errorsOccurred: boolean,
 * }>} Always resolves, never fails.
 *
 *  - `licenses` are mapped per namespace name. If an error occurs trying to get
 *      any license, it will be ignored/skipped.
 *  - `tokensRefreshed` is true if the cloud's tokens had to be refreshed during the process.
 *  - `errorsOccurred` is true if at least one error ocurred (that couldn't be safely ignored)
 *      while fetching resources.
 */
export const fetchLicenses = async function (cloud, namespaces) {
  const {
    resources: licenses,
    tokensRefreshed,
    errors,
  } = await _fetchCollection({
    resourceType: apiResourceTypes.RHEL_LICENSE,
    cloud,
    namespaces,
    create: ({ data, namespace }) => {
      const mvvData = rtv.verify(data, licenseTs).mvv;
      return new License({ data: mvvData, namespace, cloud });
    },
  });

  return { licenses, tokensRefreshed, errorsOccurred: !!errors };
};

/**
 * [ASYNC] Best-try to get all existing proxies from the management cluster, for each
 *  namespace specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 * @returns {Promise<{
 *   proxies: { [index: string]: Array<Proxy> },
 *   tokensRefreshed: boolean,
 *   errorsOccurred: boolean,
 * }>} Always resolves, never fails.
 *
 *  - `proxies` are mapped per namespace name. If an error occurs trying to get
 *      any proxy, it will be ignored/skipped.
 *  - `tokensRefreshed` is true if the cloud's tokens had to be refreshed during the process.
 *  - `errorsOccurred` is true if at least one error ocurred (that couldn't be safely ignored)
 *      while fetching resources.
 */
export const fetchProxies = async function (cloud, namespaces) {
  const {
    resources: proxies,
    tokensRefreshed,
    errors,
  } = await _fetchCollection({
    resourceType: apiResourceTypes.PROXY,
    cloud,
    namespaces,
    create: ({ data, namespace }) => {
      const mvvData = rtv.verify(data, proxyTs).mvv;
      return new Proxy({ data: mvvData, namespace, cloud });
    },
  });

  return { proxies, tokensRefreshed, errorsOccurred: !!errors };
};

/**
 * [ASYNC] Best-try to get all existing SSH keys from the management cluster, for each
 *  namespace specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 * @returns {Promise<{
 *   sshKeys: { [index: string]: Array<SshKey> },
 *   tokensRefreshed: boolean,
 *   errorsOccurred: boolean,
 * }>} Always resolves, never fails.
 *
 *  - `sshKeys` are mapped per namespace name. If an error occurs trying
 *      to get any SSH key, it will be ignored/skipped.
 *  - `tokensRefreshed` is true if the cloud's tokens had to be refreshed during the process.
 *  - `errorsOccurred` is true if at least one error ocurred (that couldn't be safely ignored)
 *      while fetching resources.
 */
export const fetchSshKeys = async function (cloud, namespaces) {
  const {
    resources: sshKeys,
    tokensRefreshed,
    errors,
  } = await _fetchCollection({
    resourceType: apiResourceTypes.PUBLIC_KEY,
    cloud,
    namespaces,
    create: ({ data, namespace }) => {
      const mvvData = rtv.verify(data, sshKeyTs).mvv;
      return new SshKey({ data: mvvData, namespace, cloud });
    },
  });

  return { sshKeys, tokensRefreshed, errorsOccurred: !!errors };
};

/**
 * [ASYNC] Best-try to get all existing Machines from the management cluster, for each
 *  namespace specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 * @returns {Promise<{
 *   machines: { [index: string]: Array<Machine> },
 *   tokensRefreshed: boolean,
 *   errorsOccurred: boolean,
 * }>} Always resolves, never fails.
 *
 *  - `machines` are mapped per namespace name. If an error occurs trying to get
 *      any Machine, it will be ignored/skipped.
 *  - `tokensRefreshed` is true if the cloud's tokens had to be refreshed during the process.
 *  - `errorsOccurred` is true if at least one error ocurred (that couldn't be safely ignored)
 *      while fetching resources.
 */
export const fetchMachines = async function (cloud, namespaces) {
  const {
    resources: machines,
    tokensRefreshed,
    errors,
  } = await _fetchCollection({
    resourceType: apiResourceTypes.MACHINE,
    cloud,
    namespaces,
    create: ({ data, namespace }) => {
      const mvvData = rtv.verify(data, machineTs).mvv;
      return new Machine({ data: mvvData, namespace, cloud });
    },
  });

  return { machines, tokensRefreshed, errorsOccurred: !!errors };
};

/**
 * [ASYNC] Best-try to get all existing clusters from the management cluster, for each
 *  namespace specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<Namespace>} namespaces List of namespaces.
 *
 *  NOTE: Each namespace is expected to already contain all known Credentials,
 *   SSH Keys, Proxies, Machines, and Licenses that this Cluster might reference.
 *
 * @returns {Promise<{
 *   clusters: { [index: string]: Array<Cluster> },
 *   tokensRefreshed: boolean,
 *   errorsOccurred: boolean,
 * }>} Always resolves, never fails.
 *
 *  - `clusters` are mapped per namespace name. If an error occurs trying to get
 *      any cluster, it will be ignored/skipped.
 *  - `tokensRefreshed` is true if the cloud's tokens had to be refreshed during the process.
 *  - `errorsOccurred` is true if at least one error ocurred (that couldn't be safely ignored)
 *      while fetching resources.
 */
export const fetchClusters = async function (cloud, namespaces) {
  const {
    resources: clusters,
    tokensRefreshed,
    errors,
  } = await _fetchCollection({
    resourceType: apiResourceTypes.CLUSTER,
    cloud,
    namespaces,
    create: ({ data, namespace }) => {
      const mvvData = rtv.verify(data, clusterTs).mvv;
      return new Cluster({ data: mvvData, namespace, cloud });
    },
  });

  return { clusters, tokensRefreshed, errorsOccurred: !!errors };
};

/**
 * [ASYNC] Best-try to get all existing namespaces from the management cluster.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {boolean} [preview] True to create a preview version of the Namespace.
 * @returns {Promise<{
 *   namespaces: Array<Namespace>,
 *   tokensRefreshed: boolean,
 *   preview: boolean,
 *   error?: { message: string, status: number, resourceType: string },
 * }>} Never fails, always resolves. If an error occurs trying to get any namespace, it will
 *  be ignored/skipped and then included in the `errors` property.
 */
export const fetchNamespaces = async function (cloud, preview = false) {
  // NOTE: we always fetch ALL known namespaces because when we display metadata
  //  about this DataCloud, we always need to show the actual total, not just
  //  what we're syncing
  const {
    resources: { [apiResourceTypes.NAMESPACE]: namespaces },
    tokensRefreshed,
    errors,
  } = await _fetchCollection({
    resourceType: apiResourceTypes.NAMESPACE,
    cloud,
    create: ({ data }) => {
      const mvvData = rtv.verify(data, namespaceTs).mvv;
      return new Namespace({ data: mvvData, cloud, preview });
    },
  });

  const userRoles = extractJwtPayload(cloud.token).iam_roles || [];

  const hasReadPermissions = (name) =>
    userRoles.includes(`m:kaas:${name}@reader`) ||
    userRoles.includes(`m:kaas:${name}@writer`) ||
    userRoles.includes(`m:kaas:${name}@user`) ||
    userRoles.includes(`m:kaas:${name}@operator`) ||
    userRoles.includes('m:kaas@global-admin');

  const ignoredNamespaces = cloud?.config?.ignoredNamespaces || [];

  return {
    namespaces: filter(
      namespaces,
      (ns) =>
        ns.phase !== apiNamespacePhases.TERMINATING &&
        !ignoredNamespaces.includes(ns.name) &&
        hasReadPermissions(ns.name)
    ),
    tokensRefreshed,
    error: errors?.[apiResourceTypes.NAMESPACE],
  };
};
