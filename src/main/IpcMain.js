//
// Main Process IPC API
//

import { observable } from 'mobx';
import { Main, Common } from '@k8slens/extensions';
import * as rtv from 'rtvjs';
import { clusterModelTs } from '../util/typesets';
import pkg from '../../package.json';

const {
  Catalog: { KubernetesCluster },
} = Common;

//
// SINGLETON
//

export const catalogSource = observable.array([]);

export class IpcMain extends Main.Ipc {
  onAddClusters = (event, models) => {
    DEV_ENV && rtv.verify({ models }, { models: [[clusterModelTs]] });

    models.forEach((model) => {
      // officially add to Lens
      this.broadcast(
        'logger',
        'log',
        'IcpMain.onAddClusters()',
        `adding cluster: uid=${model.metadata.uid}, name=${model.metadata.name}`
      );
      catalogSource.push(new KubernetesCluster(model));
      // TODO[catalog]: need to save the model to a Store so we can restore it on load...
    });
  };

  constructor(extension) {
    super(extension);
    extension.addCatalogSource(pkg.name, catalogSource);
    this.handle('addClusters', this.onAddClusters);
  }
}
