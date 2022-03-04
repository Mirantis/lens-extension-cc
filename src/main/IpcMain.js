//
// Main Process IPC API
//

import { Main } from '@k8slens/extensions';
import * as rtv from 'rtvjs';
import { logger } from '../util/logger';
import { ipcEvents } from '../constants';

// typeset for the capture() method
const captureTs = {
  level: [rtv.STRING, { oneOf: Object.keys(console) }],
  context: rtv.STRING,
  message: rtv.STRING,
};

/**
 * Singleton Main thread IPC endpoint.
 * @class IpcMain
 */
export class IpcMain extends Main.Ipc {
  //
  // SINGLETON
  //

  /**
   * Logs a message to the `logger` and broadcasts it to the Renderer so that it can
   *  be seen in the Renderer's DevTools console, which can be seen even in the installed
   *  version of Lens (as opposed to having to run Lens locally from source to access
   *  the main thread's DevTools console to see the logs).
   *
   * NOTE: The IPC bridge isn't setup immediately when the extension is activated, so
   *  calls to this method will be a noop until the bridge is established, resulting
   *  in missing log statements (if you're only looking for them on the Renderer side).
   *
   * @param {string} level Logger/console method, e.g. 'log' or 'warn'.
   * @param {string} context Identifies where the message came from, e.g. 'methodName()'.
   * @param {string} message Log message.
   * @param {...any} rest Anything else to pass to the Logger to be printed as data
   *  or parsed with '%s' placeholders in the message (same as `console` API).
   */
  capture(level, context, message, ...rest) {
    DEV_ENV && rtv.verify({ level, context, message }, captureTs);

    const params = [`__MAIN__/${context}`, message, ...rest];
    logger[level](...params);
    this.broadcast(ipcEvents.broadcast.LOGGER, level, ...params);
  }
}
