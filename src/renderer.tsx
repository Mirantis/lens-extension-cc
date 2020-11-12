import React from 'react';
import styled from '@emotion/styled';
import { LensRendererExtension } from '@k8slens/extensions';
import { AddClusterIcon, AddClusterPage } from './page';
import * as strings from './strings';
import { addRoute } from './routes';

const Item = styled.div(function () {
  return {
    color: 'var(--textColorAccent)',
    cursor: 'pointer',
    fontSize: 'var(--font-size-small)',
  };
});

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
        <Item
          className="flex align-center gaps"
          onClick={() => this.navigate(addRoute)}
        >
          <AddClusterIcon />
          <span>{strings.extension.statusBar['label']()}</span>
        </Item>
      ),
    },
  ];
}
