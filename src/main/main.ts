import { Main } from '@k8slens/extensions';
import { observable } from 'mobx';
import { globalCloudStore } from '../store/CloudStore';
import { globalSyncStore } from '../store/SyncStore';
import { IpcMain } from './IpcMain';
import { logger as loggerUtil } from '../util/logger';
import { SyncManager } from './SyncManager';
import * as consts from '../constants';
import { EXT_EVENT_OAUTH_CODE, dispatchExtEvent } from '../common/eventBus';

const logger: any = loggerUtil; // get around TS compiler's complaining

// NOTE: This code runs in a separate process from the one that the renderer.tsx
//  code runs in, so you won't be able to debug this code in DevTools, and you
//  won't see any console statements in the DevTools console. To see console
//  statements, start the Lens app from a Terminal with the following
//  command: `DEBUG=true /Applications/Lens.app/Contents/MacOS/Lens`
// Once started, you'll see console statements appear __in the Terminal__.
// For instance, you may want to hook into onActivate() or onDeactivate().

const catalogSource = observable.array([]);

export default class ExtensionMain extends Main.LensExtension {
  protected handleProtocolOauthCode = ({ search }) => {
    dispatchExtEvent({
      type: EXT_EVENT_OAUTH_CODE,
      state: search.state,
      data: search,
    });
  };

  protocolHandlers = [
    {
      pathSchema: `/${EXT_EVENT_OAUTH_CODE}`,
      handler: this.handleProtocolOauthCode,
    },
  ];

  powerDisposers = [];

  onActivate() {
    logger.log('ExtensionMain.onActivate()', 'extension activated');

    // NOTE: an extension can only have ONE registered Catalog Source
    this.addCatalogSource(consts.catalog.source, catalogSource);

    const ipcMain = IpcMain.createInstance(this);

    globalCloudStore.loadExtension(this, { ipcMain });
    globalSyncStore.loadExtension(this, { ipcMain });

    // AFTER load stores
    SyncManager.createInstance({
      extension: this,
      catalogSource,
      ipcMain: ipcMain,
    });

    this.powerDisposers.push(
      Main.Power.onSuspend(async () => ipcMain.notifyPowerSuspend())
    );

    this.powerDisposers.push(
      Main.Power.onResume(async () => ipcMain.notifyPowerResume())
    );
  }

  onDeactivate() {
    logger.log('ExtensionMain.onDeactivate()', 'Extension deactivated');

    this.powerDisposers.forEach((disposer) => disposer());
    this.powerDisposers = [];
  }
}
