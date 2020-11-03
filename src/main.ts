import { LensMainExtension, windowManager } from '@k8slens/extensions';
import { getAddUrl } from './routes';
import pkg from '../package.json';

export default class ExtensionMain extends LensMainExtension {
  appMenus = [
    {
      parentId: 'file',
      label: 'Add Cloud Cluster',
      click() {
        windowManager.navigate(getAddUrl());
      }
    }
  ];

  onActivate() {
    // console.log(`${pkg.name} activated`);
    console.log('FOO');
  }

  onDeactivate() {
    // DEBUG TODO is this a reliable place where I can know that Lens is shutting
    //  down and I need to save state one last time?
    // if (authState.changed) {
    //   extActions.setAuthState(authState); // capture any changes before extension is closed
    // }
    console.log(`${pkg.name} deactivated`);
  }
}
