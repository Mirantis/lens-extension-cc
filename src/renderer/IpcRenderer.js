//
// Renderer Process IPC API
//

import { Renderer } from '@k8slens/extensions';
import { logger } from '../util/logger';

//
// SINGLETON
//

export class IpcRenderer extends Renderer.Ipc {
  // NOTE: while this does make it easier to get logger messages from the Main
  //  process, any modification to the Main process will require Lens to be
  //  completely restarted (more than just reloaded with CMD+R) in order to
  //  take effect
  onLogger = (event, level, ...args) => {
    logger[level](...args);
  };

  constructor(extension) {
    super(extension);
    this.listen('logger', this.onLogger);
  }
}
