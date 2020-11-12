import React from 'react';
import { LensRendererExtension } from '@k8slens/extensions';
import { AddClusterIcon, AddClusterPage } from './page';
import * as strings from './strings';
import { addRoute } from './routes';

export default class ExtensionRenderer extends LensRendererExtension {
  globalPages = [
    {
      routePath: addRoute,
      components: {
        Page: () => <AddClusterPage extension={this} />,
      },
    },
  ];

  statusBarItems = [
    {
      item: (
        <div
          className="flex align-center gaps hover-highlight"
          onClick={() => this.navigate(addRoute)}
        >
          <AddClusterIcon />
          <span>{strings.extension.statusBar['label']()}</span>
        </div>
      ),
    },
  ];
}
