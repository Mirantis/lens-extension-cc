//
// Cheap Event Bus
// TODO: Remove this and move to page params;
//  TRACKING: https://github.com/Mirantis/lens-extension-cc/issues/23
//

import * as rtv from 'rtvjs';
import { EXT_EVENT_OAUTH_CODE } from '../constants';

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
 * OAuth (SSO) redirect route after user gives Lens access permission.
 *
 * `event.data` is an object with the following properties:
 * - code {string} Temporary access code to use to obtain tokens.
 * - [state] {string} Optional app state from code request.
 * - [error] (string} Optional error message.
 * - [error_description] {string} Optional error description.
 */
/** RTV Typeset to validate the event object for an `EXT_EVENT_OAUTH_CODE` event. */
export const extEventOauthCodeTs = {
  type: [rtv.STRING, { exact: EXT_EVENT_OAUTH_CODE }],
  data: {
    code: rtv.STRING,
    state: [rtv.OPTIONAL, rtv.STRING],
    error: [rtv.OPTIONAL, rtv.STRING],
    error_description: [rtv.OPTIONAL, rtv.STRING],
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
        handlers.forEach((handler) => {
          try {
            handler(event);
          } catch {
            // ignore
          }
        });
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
