import { Main } from '@k8slens/extensions';
import { cloudStore } from '../store/CloudStore';
import { IpcMain } from './IpcMain';
import { logger as loggerUtil } from '../util/logger';

const logger: any = loggerUtil; // get around TS compiler's complaining

// NOTE: This code runs in a separate process from the one that the renderer.tsx
//  code runs in, so you won't be able to debug this code in DevTools, and you
//  won't see any console statements in the DevTools console. To see console
//  statements, start the Lens app from a Terminal with the following
//  command: `DEBUG=true /Applications/Lens.app/Contents/MacOS/Lens`
// Once started, you'll see console statements appear __in the Terminal__.
// For instance, you may want to hook into onActivate() or onDeactivate().

export default class ExtensionMain extends Main.LensExtension {
  onActivate() {
    logger.log('ExtensionMain.onActivate()', 'extension activated');
    cloudStore.loadExtension(this);
    IpcMain.createInstance(this); // AFTER load stores

    if (DEV_ENV) {
      IpcMain.getInstance().addFakeItems();
    }
  }

  onDeactivate() {
    logger.log('ExtensionMain.onDeactivate()', 'extension deactivated');
  }
}
