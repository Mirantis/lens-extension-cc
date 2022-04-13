//
// Base class providing event dispatching capabilities
//

import { logger, logValue } from '../util/logger';

export class EventDispatcher {
  constructor() {
    const _eventListeners = {}; // map of event name to array of functions that are handlers
    const _eventQueue = []; // list of `{ name: string, params: Array }` objects to dispatch
    let _dispatchTimerId; // ID of the scheduled dispatch timer if a dispatch is scheduled, or undefined

    // asynchronously dispatches queued events on the next frame
    const _scheduleDispatch = () => {
      if (_dispatchTimerId === undefined) {
        _dispatchTimerId = setTimeout(() => {
          _dispatchTimerId = undefined;
          if (
            Object.keys(_eventListeners).length > 0 &&
            _eventQueue.length > 0
          ) {
            const events = _eventQueue.concat(); // shallow clone for local copy

            // remove all events immediately in case more get added while we're
            //  looping through this set
            _eventQueue.length = 0;

            // NOTE: somehow, though this code appers synchronous, there's something
            //  in `Array.forEach()` that appears to loop over multiple execution frames,
            //  so it's possible that while we're looping, new events are dispatched
            events.forEach((event) => {
              const { name, params } = event;
              const handlers = _eventListeners[name] || [];
              handlers.forEach((handler) => {
                try {
                  handler({ name, target: this }, ...params);
                } catch (err) {
                  if (!err?.message.startsWith('[MobX]')) {
                    logger.error(
                      'EventDispatcher._scheduleDispatch()',
                      `Event handler failed; event=${logValue(
                        name
                      )}, error=${logValue(err.message)} emitter=${this}`
                    );
                  }
                  // else, ignore the noise
                }
              });
            });

            if (_eventQueue.length > 0) {
              // received new events while processing previous batch
              _scheduleDispatch();
            }
          }
        });
      }
      // else, dispatch already scheduled
    };

    Object.defineProperties(this, {
      /**
       * Adds an event listener to this instance.
       * @method addEventListener
       * @param {string} name Event name.
       * @param {(event: { name: string, target: any }, ...params: any[]) => void} handler Handler.
       *  The `target` is the event emitter (i.e. `this` class instance).
       *  The `params` are any parameters specified when the event was dispatched.
       */
      addEventListener: {
        enumerable: true,
        value(name, handler) {
          if (!name || !handler) {
            throw new Error('Event name and handler are required');
          }

          _eventListeners[name] = _eventListeners[name] || [];
          if (!_eventListeners[name].find((h) => h === handler)) {
            _eventListeners[name].push(handler);
            _scheduleDispatch();
          }
        },
      },

      /**
       * Removes an event listener from this Cloud instance.
       * @method removeEventListener
       * @param {string} name Event name.
       * @param {Function} handler Handler.
       */
      removeEventListener: {
        enumerable: true,
        value(name, handler) {
          if (!name || !handler) {
            throw new Error('Event name and handler are required');
          }

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
       * Dispatches an event to all listenders on this instance. Unlike `sendEvent()`,
       *  if the event is already scheduled (has already been dispatched once, but not
       *  yet sent), __its parameters are updated with the new ones given__ (even if
       *  none are given). This serves as a way to de-duplicate events if the same event
       *  is dispatched multiple times in a row.
       *
       * NOTE: `params` will be __overwritten__ with subsequent params if the same
       *  event is dispatched multiple times before actually being sent. This is
       *  possible since events are not sent immediately. They are always sent in
       *  a future execution frame.
       *
       * @method dispatchEvent
       * @param {string} name Event name.
       * @param {Array} [params] Parameters to pass to each handler, if any.
       * @see #sendEvent
       */
      dispatchEvent: {
        enumerable: false,
        value(name, ...params) {
          if (!name) {
            throw new Error('Event name is required');
          }

          const event = _eventQueue.find((e) => e.name === name);
          if (event) {
            event.params = params;
            // don't schedule dispatch in this case because we would have already
            //  scheduled it when the event was first added to the queue; we
            //  just haven't gotten to the next frame yet where we'll dispatch it
          } else {
            _eventQueue.push({ name, params });
            _scheduleDispatch();
          }
        },
      },

      /**
       * Sends an event to all listenders on this instance. Unlike `dispatchEvent()`,
       *  __every single event is sent__ to all its listeners, each with its own
       *  set of parameters.
       *
       * NOTE: Use this method carefully so as not to overwhelm listeners with a stream
       *  of events. Use this method instead of `dispatchEvent()` only if it's necessary
       *  for listeners to receive each set of parameters sent.
       *
       * @method sendEvent
       * @param {string} name Event name.
       * @param {Array} [params] Parameters to pass to each handler, if any.
       * @see #dispatchEvent
       */
      sendEvent: {
        enumerable: false,
        value(name, ...params) {
          if (!name) {
            throw new Error('Event name is required');
          }

          _eventQueue.push({ name, params });
          _scheduleDispatch();
        },
      },

      /**
       * Removes all events in the queue without notifying listeners.
       */
      emptyEventQueue: {
        enumerable: false,
        value() {
          _eventQueue.length = 0;
        },
      },
    });
  }
}
