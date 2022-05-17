//
// Main Process IPC API
//

import process from 'process';
import { Main } from '@k8slens/extensions';
import * as rtv from 'rtvjs';
import { logger } from '../util/logger';
import { ipcEvents } from '../constants';

// enabled if flag is not set, or specifically set to 'true', 'yes', or '1'
// set to some other non-empty value to disable it
const captureEnabled =
  !process.env.LEX_CC_MAIN_CAPTURE ||
  process.env.LEX_CC_MAIN_CAPTURE.match(/^(true|yes|1)$/);

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
   * NOTE: Broadcast is enabled from the command line by using the `LEX_CC_MAIN_CAPTURE` flag.
   *  If broadcast is disabled, the method will still log to the console as usual.
   *
   * @param {string} level Logger/console method, e.g. 'log' or 'warn'.
   * @param {string} context Identifies where the message came from, e.g. 'methodName()'.
   * @param {string} message Log message.
   * @param {...any} rest Anything else to pass to the Logger to be printed as data
   *  or parsed with '%s' placeholders in the message (same as `console` API).
   */
  capture(level, context, message, ...rest) {
    DEV_ENV && rtv.verify({ level, context, message }, captureTs);

    // always log as normal to console
    logger[level](context, message, ...rest);

    // only broadcast if enabled
    if (captureEnabled) {
      this.broadcast(
        ipcEvents.broadcast.LOGGER,
        level,
        `__MAIN__/${context}`,
        message,
        ...rest
      );
    }
  }

  /**
   * Notifies of a change in a Cloud's connection status.
   * @param {string} cloudUrl URL of the Cloud (mgmt cluster).
   * @param {{ connecting: boolean, connectError: string|null }} status New connection status.
   */
  notifyCloudStatusChange(cloudUrl, status) {
    DEV_ENV &&
      rtv.verify(
        { cloudUrl, status },
        {
          cloudUrl: rtv.STRING,
          status: {
            connecting: rtv.BOOLEAN,
            connectError: [rtv.EXPECTED, rtv.STRING],
          },
        }
      );

    this.broadcast(ipcEvents.broadcast.CLOUD_STATUS_CHANGE, cloudUrl, status);
  }

  /**
   * Notifies of a change in a Cloud's loaded state.
   * @param {string} cloudUrl URL of the Cloud (mgmt cluster).
   * @param {boolean} loaded New loaded state.
   */
  notifyCloudLoadedChange(cloudUrl, loaded) {
    DEV_ENV &&
      rtv.verify(
        { cloudUrl, loaded },
        {
          cloudUrl: rtv.STRING,
          loaded: rtv.BOOLEAN,
        }
      );

    this.broadcast(ipcEvents.broadcast.CLOUD_LOADED_CHANGE, cloudUrl, loaded);
  }

  /**
   * Notifies of a change in a Cloud's fetching state.
   * @param {string} cloudUrl URL of the Cloud (mgmt cluster).
   * @param {boolean} fetching New fetching state.
   */
  notifyCloudFetchingChange(cloudUrl, fetching) {
    DEV_ENV &&
      rtv.verify(
        { cloudUrl, fetching },
        {
          cloudUrl: rtv.STRING,
          fetching: rtv.BOOLEAN,
        }
      );

    this.broadcast(
      ipcEvents.broadcast.CLOUD_FETCHING_CHANGE,
      cloudUrl,
      fetching
    );
  }

  /** Notifies listeners that power is being suspended. */
  notifyPowerSuspend() {
    this.broadcast(ipcEvents.broadcast.POWER_SUSPEND);
  }

  /** Notifies listeners that power has been restored. */
  notifyPowerResume() {
    this.broadcast(ipcEvents.broadcast.POWER_RESUME);
  }
}
