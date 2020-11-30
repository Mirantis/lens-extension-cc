import React from 'react';
import styled from '@emotion/styled';
import { LensRendererExtension } from '@k8slens/extensions';
import { ContainerCloudIcon, AddClusterPage } from './page';
import * as strings from './strings';
import { addRoute } from './routes';

const itemColor = 'white'; // CSS color; Lens hard-codes the color of the workspace indicator item to 'white' also

const Item = styled.div(function () {
  return {
    color: itemColor,
    cursor: 'pointer',
    fontSize: 'var(--font-size-small)',
    padding: '2px 4px', // same as used for active workspace indicator on the left corner
  };
});

export default class ExtensionRenderer extends LensRendererExtension {
  globalPages = [
    {
      id: addRoute,
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
          <ContainerCloudIcon fill={itemColor} />
          <span>{strings.extension.statusBar['label']()}</span>
        </Item>
      ),
    },
  ];
}
