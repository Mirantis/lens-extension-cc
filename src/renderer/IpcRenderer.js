//
// Renderer Process IPC API
//

import { Renderer } from '@k8slens/extensions';
import { logger } from '../util/logger';
import { ipcEvents } from '../constants';

/**
 * Singleton Renderer thread IPC endpoint.
 * @class IpcMain
 */
export class IpcRenderer extends Renderer.Ipc {
  //
  // HANDLERS
  //

  /**
   * Invoke a call on `logger` in the Renderer process.
   * @param {string} level One of the logger/console methods, e.g. 'log', 'info', 'error'.
   * @param {...any} args Anything else to pass to the Logger to be printed as data
   *  or parsed with '%s' placeholders in the message (same as `console` API).
   */
  handleLogger = (event, level, ...args) => {
    // NOTE: while this does make it easier to get logger messages from the Main
    //  process, any modification to the Main process will require Lens to be
    //  completely restarted (more than just reloaded with CMD+R) in order to
    //  take effect
    logger[level](...args);
  };

  //
  // SINGLETON
  //

  constructor(extension) {
    super(extension);
    this.listen(ipcEvents.broadcast.LOGGER, this.handleLogger);
  }

  /** Notifies listeners that network connectivity has been dropped. */
  notifyNetworkOffline() {
    this.broadcast(ipcEvents.broadcast.NETWORK_OFFLINE);
  }

  /** Notifies listeners that network connectivity has been restored. */
  notifyNetworkOnline() {
    this.broadcast(ipcEvents.broadcast.NETWORK_ONLINE);
  }
}
