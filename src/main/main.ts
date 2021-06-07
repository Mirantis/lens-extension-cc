import { Main } from '@k8slens/extensions';
import { mainRoute } from '../routes';
import { prefStore } from '../store/PreferenceStore';
import { clusterStore } from '../store/ClusterStore';
import { IpcMain } from './IpcMain';
import { logger as loggerUtil } from '../util/logger';
import * as strings from '../strings';

const logger: any = loggerUtil; // get around TS compiler's complaining

// NOTE: This code runs in a separate process from the one that the renderer.tsx
//  code runs in, so you won't be able to debug this code in DevTools, and you
//  won't see any console statements in the DevTools console. To see console
//  statements, start the Lens app from a Terminal with the following
//  command: `DEBUG=true /Applications/Lens.app/Contents/MacOS/Lens`
// Once started, you'll see console statements appear __in the Terminal__.
// For instance, you may want to hook into onActivate() or onDeactivate().

export default class ExtensionMain extends Main.LensExtension {
  appMenus = [
    {
      parentId: 'file',
      label: strings.extension.appMenu['label'](),
      click: () => {
        this.navigate(mainRoute);
      },
    },
  ];

  onActivate() {
    logger.log('ExtensionMain.onActivate()', 'extension activated');
    prefStore.loadExtension(this);
    clusterStore.loadExtension(this);
    IpcMain.createInstance(this); // AFTER load stores
  }

  onDeactivate() {
    logger.log('ExtensionMain.onDeactivate()', 'extension deactivated');
  }
}
