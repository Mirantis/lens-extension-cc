import React from 'react';
import { LensRendererExtension, Navigation } from '@k8slens/extensions';
import { addRoute, getAddUrl } from './routes';
import { AddClusterIcon, AddClusterPage } from './page';

export default class ExtensionRenderer extends LensRendererExtension {
  globalPages = [
    {
      ...addRoute,
      url: getAddUrl(),
      hideInMenu: true,
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
          onClick={() => Navigation.navigate(getAddUrl())}
        >
          <AddClusterIcon />
          <span>Add Cloud Cluster</span>
        </div>
      ),
    },
  ];
}
