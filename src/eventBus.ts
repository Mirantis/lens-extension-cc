//
// Cheap Event Bus
// TODO: Remove this and move to page params;
//  TRACKING: https://github.com/Mirantis/lens-extension-cc/issues/23
//

import rtv from 'rtvjs';
import { AuthAccess } from './cc/auth/AuthAccess';

//
// TYPES
//

type eventType = string;

export interface ExtensionEvent {
  type: eventType;
  data?: any;
}

interface eventHandler {
  (event: ExtensionEvent): void;
}

interface HandlerMap {
  /**
   * Event type -> list of handlers.
   *
   * An entry only exists if there are handlers listening for that type of event.
   */
  [index: string]: Array<eventHandler>;
}

/** Queued events to send to listeners. */
type EventQueue = Array<ExtensionEvent>;

//
// EVENTS
//

/**
 * Activates an existing cluster in Lens.
 *
 * `event.data` is an object with the following properties:
 * - cloudUrl {string} MCC instance base URL.
 * - namespace {string} Name of the namespace that contains the cluster.
 * - clusterName (string) Name of the cluster being activated.
 * - clusterId {string} ID of the cluster being activated.
 */
export const EXT_EVENT_ACTIVATE_CLUSTER = 'activateCluster';

/** RTV Typeset to validate the event object for an `EXT_EVENT_ACTIVATE_CLUSTER` event. */
export const extEventActivateClusterTs = {
  type: [rtv.STRING, { exact: EXT_EVENT_ACTIVATE_CLUSTER }],
  data: {
    cloudUrl: rtv.STRING,
    namespace: rtv.STRING,
    clusterName: rtv.STRING,
    clusterId: rtv.STRING,
  },
};

/**
 * List all clusters in MCC instance.
 *
 * `event.data` is an object with the following properties:
 * - cloudUrl {string} MCC instance base URL.
 * - username {string}
 * - tokens {{ id_token: string, expires_in: number, refresh_token: string, refresh_expires_in: number }} API tokens object.
 */
export const EXT_EVENT_ADD_CLUSTERS = 'addClusters';

/** RTV Typeset to validate the event object for an `EXT_EVENT_ADD_CLUSTERS` event. */
export const extEventAddClustersTs = {
  type: [rtv.STRING, { exact: EXT_EVENT_ADD_CLUSTERS }],
  data: {
    cloudUrl: rtv.STRING,
    username: rtv.STRING,
    tokens: AuthAccess.tokensTs,
  },
};

/**
 * Add a single kubeConfig.
 *
 * `event.data` is an object with the following properties:
 * - cloudUrl {string} URL of the MCC instance.
 * - namespace {string} Name of the namespace that contains the cluster.
 * - clusterName (string) Name of the cluster being added.
 * - clusterId {string} ID of the cluster being added.
 * - kubeConfig {Object} JSON object representing the kubeConfig to add.
 */
export const EXT_EVENT_KUBECONFIG = 'kubeConfig';

/** RTV Typeset to validate the event object for an `EXT_EVENT_KUBECONFIG` event. */
export const extEventKubeconfigTs = {
  type: [rtv.STRING, { exact: EXT_EVENT_ADD_CLUSTERS }],
  data: {
    cloudUrl: rtv.STRING,
    namespace: rtv.STRING,
    clusterName: rtv.STRING,
    clusterId: rtv.STRING,
    kubeConfig: rtv.PLAIN_OBJECT,
  },
};

//
// MODULE
//

const eventHandlers: HandlerMap = {};
const eventQueue: EventQueue = [];

/**
 * Dispatches events asynchronously IIF there are handlers and events in the queue.
 *  Otherwise, events are queued until there is at least one handler, regardless
 *  of event type. Once there is at least one handler (regardless of type), all
 *  queued events are dispatched (even if there are no handlers for any of them),
 *  similar to firing mouseUp events even if there are no handlers for them, and
 *  adding a handler for mouseUp later doesn't mean you get all the past events
 *  at that point in time.
 */
const scheduleDispatch = function (): void {
  // async on the next frame
  setTimeout(function () {
    if (Object.keys(eventHandlers).length > 0 && eventQueue.length > 0) {
      eventQueue.forEach((event: ExtensionEvent) => {
        const handlers = eventHandlers[event.type] || [];
        handlers.forEach((handler) => handler(event));
      });

      eventQueue.length = 0; // remove all events
    }
  });
};

/** Add an extension event to the queue and schedule dispatch. */
export const dispatchExtEvent = function (event: ExtensionEvent): void {
  eventQueue.push(event);
  scheduleDispatch();
};

/** Add an extension event handler for a specific event type and schedule dispatch. */
export const addExtEventHandler = function (
  type: eventType,
  handler: eventHandler
): void {
  eventHandlers[type] = eventHandlers[type] || [];
  eventHandlers[type].push(handler);
  scheduleDispatch();
};

/** Remove an extension event handler for a specific event type. */
export const removeExtEventHandler = function (
  type: eventType,
  handler: eventHandler
): void {
  if (eventHandlers[type]) {
    const idx = eventHandlers[type].indexOf(handler);
    if (idx >= 0) {
      eventHandlers[type].splice(idx, 1);
      if (eventHandlers[type].length <= 0) {
        delete eventHandlers[type]; // no more handlers for this type
      }
    }
  }
};
