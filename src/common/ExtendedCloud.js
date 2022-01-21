import * as rtv from 'rtvjs';
import { Cloud } from './Cloud';
import { filter, find, flatten } from 'lodash';
import { authedRequest, extractJwtPayload } from '../renderer/auth/authUtil';
import * as strings from '../strings';
import { Namespace } from '../renderer/store/Namespace';
import { logger } from '../util/logger';
import { Cluster } from '../renderer/store/Cluster';

export const EXTENDED_CLOUD_EVENTS = Object.freeze({
  LOADING_CHANGE: 'loadingChange',
  DATA_UPDATED: 'dataUpdated',
});

const FIVE_MIN = 300 * 1000;

const credentialTypes = [
  'awscredential',
  'byocredential',
  'openstackcredential',
];

const getErrorMessage = (error) => {
  if (!error) {
    return null;
  }
  if (typeof error === 'string') {
    return error;
  }
  return error.message;
};

const _deserializeCredentialsList = function (body) {
  if (!body || !Array.isArray(body.items)) {
    return {
      error: strings.extendedCloud.error.credentials(),
    };
  }

  return body.items;
};

const _fetchCredentials = async function (cloud, namespaces) {
  const results = await Promise.all(
    credentialTypes.map(async (entity) => {
      return await Promise.all(
        namespaces.map(async (namespaceName) => {
          const { body, error } = await authedRequest({
            baseUrl: cloud.cloudUrl,
            cloud,
            config: cloud.config,
            method: 'list',
            entity,
            args: { namespaceName }, // extra args
          });
          const items = _deserializeCredentialsList(body);
          return {
            items,
            error: error || items.error,
            namespace: namespaceName,
            credentialType: entity,
          };
        })
      );
    })
  );
  const flattenCreds = flatten(results);

  const error = flattenCreds.find((c) => c.error);

  if (error) {
    return { error };
  }

  const credentials = flattenCreds.reduce((acc, val) => {
    const { namespace, credentialType, items } = val;
    if (acc[namespace]) {
      acc[namespace][credentialType] = items;
      acc[namespace].allCredentialsCount += items.length;
    } else {
      acc[namespace] = {
        [credentialType]: items,
        allCredentialsCount: items.length,
      };
    }
    return acc;
  }, {});

  return { credentials };
};

const _deserializeSshKeysList = function (body) {
  if (!body || !Array.isArray(body.items)) {
    return {
      error: strings.extendedCloud.error.sshKeys(),
    };
  }

  return body.items;
};

const _fetchSshKeys = async function (cloud, namespaces) {
  const results = await Promise.all(
    namespaces.map(async (namespaceName) => {
      const { body, error } = await authedRequest({
        baseUrl: cloud.cloudUrl,
        cloud,
        config: cloud.config,
        method: 'list',
        entity: 'publickey',
        args: { namespaceName }, // extra args
      });
      const items = _deserializeSshKeysList(body);
      return { items, error: error || items.error, namespace: namespaceName };
    })
  );
  const errResult = find(results, (r) => !!r.error);
  if (errResult) {
    return { error: errResult.error };
  }

  return { sshKeys: results };
};

/**
 * Deserialize the raw list of cluster data from the API into Cluster objects.
 * @param {Object} body Data response from /list/cluster API.
 * @returns {Array<Cluster>} Array of Cluster objects.
 */
const _deserializeClustersList = function (body) {
  if (!body || !Array.isArray(body.items)) {
    return { error: strings.clusterDataProvider.error.invalidClusterPayload() };
  }

  return {
    data: body.items
      .map((item, idx) => {
        try {
          return new Cluster(item);
        } catch (err) {
          logger.error(
            'ExtendedCloud._deserializeClustersList()',
            `Failed to deserialize cluster ${idx} (namespace/name="${
              item?.metadata?.namespace ?? '<unknown>'
            }/${item?.metadata?.name ?? '<unknown>'}"): ${err.message}`,
            err
          );
          return undefined;
        }
      })
      .filter((cl) => !!cl), // eliminate invalid clusters (`undefined` items)
  };
};

/**
 * Deserialize the raw list of namespace data from the API into Namespace objects.
 * @param {Object} body Data response from /list/namespace API.
 * @returns {Array<Namespace>} Array of Namespace objects.
 */
const _deserializeNamespacesList = function (body) {
  if (!body || !Array.isArray(body.items)) {
    return {
      error: strings.clusterDataProvider.error.invalidNamespacePayload(),
    };
  }

  return {
    data: body.items
      .map((item, idx) => {
        try {
          return new Namespace(item);
        } catch (err) {
          logger.error(
            'ExtendedCloud._deserializeNamespacesList()',
            `Failed to deserialize namespace ${idx}: ${err.message}`,
            err
          );
          return undefined;
        }
      })
      .filter((cl) => !!cl), // eliminate invalid namespaces (`undefined` items)
  };
};

/**
 * [ASYNC] Get all existing namespaces from the management cluster.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {boolean} [loadAll] if true all namespaces will be loaded. Doesn't matter if we have something in syncNamespaces
 * @returns {Promise<Object>} On success `{ namespaces: Array<string> }`;
 *  on error `{error: string}`.
 */
const _fetchNamespaces = async function (cloud, loadAll) {
  // return syncNamespaces if we already define them
  if (!loadAll && cloud?.syncNamespaces?.length) {
    return { namespaces: cloud.syncNamespaces };
  }
  const { error, body } = await authedRequest({
    baseUrl: cloud.cloudUrl,
    config: cloud.config,
    cloud,
    method: 'list',
    entity: 'namespace',
  });

  if (error) {
    return { error };
  }

  const { data, error: dsError } = _deserializeNamespacesList(body);
  if (dsError) {
    return { error: dsError };
  }

  const userRoles = extractJwtPayload(cloud.token).iam_roles || [];

  const hasReadPermissions = (name) =>
    userRoles.includes(`m:kaas:${name}@reader`) ||
    userRoles.includes(`m:kaas:${name}@writer`);

  const ignoredNamespaces = cloud?.config?.ignoredNamespaces || [];
  const namespaces = filter(
    data,
    (ns) => !ignoredNamespaces.includes(ns.name) && hasReadPermissions(ns.name)
  ).map(({ name }) => name);

  return { namespaces };
};

/**
 * [ASYNC] Get all existing clusters from the management cluster, for each namespace
 *  specified.
 * @param {Cloud} cloud An Cloud object. Tokens will be updated/cleared
 *  if necessary.
 * @param {Array<string>} namespaces List of namespace NAMES for which to retrieve
 *  clusters.
 * @returns {Promise<Object>} On success `{ clusters: Array<Cluster< }` where the
 *  list of clusters is flat and in the order of the specified namespaces (use
 *  `Cluster.namespace` to identify which cluster belongs to which namespace);
 *  on error `{error: string}`. The error will be the first-found error out of
 *  all namespaces on which cluster retrieval was attempted.
 */
const _fetchClusters = async function (cloud, namespaces) {
  const results = await Promise.all(
    namespaces.map((namespaceName) =>
      authedRequest({
        baseUrl: cloud.cloudUrl,
        cloud,
        config: cloud.config,
        method: 'list',
        entity: 'cluster',
        args: { namespaceName }, // extra args
      })
    )
  );

  const errResult = find(results, (r) => !!r.error);
  if (errResult) {
    return { error: errResult.error };
  }

  let clusters = [];
  let dsError;

  results.every((result) => {
    const { data, error } = _deserializeClustersList(result.body);
    if (error) {
      dsError = { error };
      return false; // break
    }

    clusters = [...clusters, ...data];
    return true; // next
  });

  return dsError || { clusters };
};

export class ExtendedCloud {
  constructor(cloud) {
    const _eventListeners = {}; // map of event name to array of functions that are handlers
    const _eventQueue = []; // list of `{ name: string, params: Array }` objects to dispatch
    let _error = null;

    // asynchronously dispatches queued events on the next frame
    const _scheduleDispatch = () => {
      setTimeout(function () {
        if (Object.keys(_eventListeners).length > 0 && _eventQueue.length > 0) {
          const events = _eventQueue.concat(); // shallow clone for local copy

          // remove all events immediately in case more get added while we're
          //  looping through this set
          _eventQueue.length = 0;

          events.forEach((event) => {
            const { name, params } = event;
            const handlers = _eventListeners[name] || [];
            handlers.forEach((handler) => {
              try {
                handler(...params);
              } catch {
                // ignore
              }
            });
          });

          if (_eventQueue.length > 0) {
            // received new events while processing previous batch
            _scheduleDispatch();
          }
        }
      });
    };

    Object.defineProperties(this, {
      /**
       * Adds an event listener to this Cloud instance.
       * @method addEventListener
       * @param {string} name Event name.
       * @param {Function} handler Handler.
       */
      addEventListener: {
        enumerable: false,
        value(name, handler) {
          _eventListeners[name] = _eventListeners[name] || [];
          if (!_eventListeners[name].find(handler)) {
            _eventListeners[name].push(handler);
            _scheduleDispatch();
          }
        },
      },

      /**
       * Removes an event listener from ExtendedCloud instance.
       * @method removeEventListener
       * @param {string} name Event name.
       * @param {Function} handler Handler.
       */
      removeEventListener: {
        enumerable: false,
        value(name, handler) {
          const idx =
            _eventListeners[name]?.findIndex((h) => h === handler) ?? -1;
          if (idx >= 0) {
            _eventListeners[name].splice(idx, 1);
            if (_eventListeners[name].length <= 0) {
              delete _eventListeners[name];
            }
          }
        },
      },

      /**
       * Dispatches an event to all listeners on ExtendedCloud instance. If the
       *  event is already scheduled, its parameters are updated with the new
       *  ones given (even if none are given). This also serves as a way to
       *  de-duplicate events if the same event is dispatched multiple times
       *  in a row.
       * @method dispatchEvent
       * @param {string} name Event name.
       * @param {Array} [params] Parameters to pass to each handler, if any.
       */
      dispatchEvent: {
        enumerable: false,
        value(name, ...params) {
          const event = _eventQueue.find((e) => e.name === name);
          if (event) {
            event.params = params;
            // don't schedule dispatch in this case because we wouldn't already
            //  scheduled it when the event was first added to the queue; we
            //  just haven't gotten to the next frame yet where we'll dispatch it
          } else {
            _eventQueue.push({ name, params });
            _scheduleDispatch();
          }
        },
      },
    });

    DEV_ENV &&
      rtv.verify(
        { cloud },
        { cloud: [rtv.EXPECTED, rtv.CLASS_OBJECT, { ctor: Cloud }] }
      );

    let _loading = false;
    let _namespaces = null;

    Object.defineProperty(this, 'cloud', {
      enumerable: true,
      get() {
        return cloud;
      },
    });
    Object.defineProperty(this, 'loading', {
      enumerable: true,
      get() {
        return _loading;
      },
      set(newValue) {
        if (newValue !== _loading) {
          _loading = newValue;
          this.dispatchEvent(EXTENDED_CLOUD_EVENTS.LOADING_CHANGE, this);
        }
      },
    });
    Object.defineProperty(this, 'namespaces', {
      enumerable: true,
      get() {
        return _namespaces;
      },
      set(newValue) {
        _namespaces = newValue;
        this.dispatchEvent(EXTENDED_CLOUD_EVENTS.DATA_UPDATED, this);
      },
    });

    Object.defineProperty(this, 'error', {
      enumerable: true,
      get() {
        return _error;
      },
      set(newValue) {
        _error = newValue;
      },
    });

    setTimeout(() => this.init());
  }

  startUpdateCloudByTimeOut() {
    this._updateInterval = setInterval(() => {
      this.init();
    }, FIVE_MIN);
  }

  stopUpdateCloudByTimeOut() {
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
    }
  }

  /**
   *
   * @param {boolean} [loadAll] fetch all namespaces, ignore syncNamespaces
   * @return {Promise<ExtendedCloud>}
   */
  async init(loadAll) {
    this.loading = true;
    this.error = null;

    const { error: nameSpaceError, namespaces } = await _fetchNamespaces(
      this.cloud,
      loadAll
    );
    if (nameSpaceError) {
      this.error = getErrorMessage(nameSpaceError);
      logger.error(
        'extendedCloud.init()',
        `_fetchNamespaces error: ${this.error}`,
        nameSpaceError
      );
      this.loading = false;
    } else {
      const { error: clustersError, clusters } = await _fetchClusters(
        this.cloud,
        namespaces
      );
      const { error: sshKeysError, sshKeys } = await _fetchSshKeys(
        this.cloud,
        namespaces
      );
      const { error: credentialsError, credentials } = await _fetchCredentials(
        this.cloud,
        namespaces
      );

      const error = clustersError || sshKeysError || credentialsError;
      if (error) {
        this.error = getErrorMessage(error);
        logger.error(
          'extendedCloud.init()',
          `Fetched data contains an error: ${this.error}`,
          error
        );
        this.loading = false;
      } else {
        this.namespaces = namespaces.map((name) => {
          const nameSpaceClusters = clusters.filter(
            (c) => c.namespace === name
          );
          const nameSpaceSshKeys =
            sshKeys.find((key) => key.namespace === name)?.items || [];

          return {
            name,
            clusters: nameSpaceClusters,
            clustersCount: nameSpaceClusters.length,
            sshKeys: nameSpaceSshKeys,
            sshKeysCount: nameSpaceSshKeys.length,
            credentials: credentials[name],
          };
        });

        this.loading = false;
        return this;
      }
    }
  }
}
