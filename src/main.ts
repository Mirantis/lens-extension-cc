import { LensMainExtension, windowManager } from '@k8slens/extensions';
import { getAddUrl } from './routes';
import * as strings from './strings';

export default class ExtensionMain extends LensMainExtension {
  appMenus = [
    {
      parentId: 'file',
      label: strings.extension.menu['label'](),
      click() {
        windowManager.navigate(getAddUrl());
      },
    },
  ];

  // NOTE: This code runs in a separate process from the one that the renderer.tsx
  //  code runs in, so you won't be able to debug this code in DevTools, and you
  //  won't see any console statements in the DevTools console. To see console
  //  statements, start the Lens app from a Terminal with the following
  //  command: `DEBUG=true /Applications/Lens.app/Contents/MacOS/Lens`
  // Once started, you'll see console statements appear __in the Terminal__.
  // For instance, you may want to hook into onActivate() or onDeactivate().
}
