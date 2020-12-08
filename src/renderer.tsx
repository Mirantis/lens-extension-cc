import React from 'react';
import styled from '@emotion/styled';
import { LensRendererExtension } from '@k8slens/extensions';
import { ContainerCloudIcon, AddClusterPage } from './page';
import * as strings from './strings';
import { addRoute } from './routes';
import {
  EXT_EVENT_CLUSTERS,
  EXT_EVENT_KUBECONFIG,
  dispatchExtEvent,
} from './eventBus';
import pkg from '../package.json';

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
      // DEBUG REMOVE once have protocol handler...
      item: (
        <Item
          className="flex align-center gaps"
          onClick={() => {
            this.navigate(addRoute);

            // DEBUG TODO test this again
            dispatchExtEvent({
              type: EXT_EVENT_CLUSTERS,
              data: {
                username: 'writer',
                baseUrl: 'http://foo.com',
                tokens: {
                  id_token: 'asdf',
                  expires_in: Date.now(),
                  refresh_token: 'zxcv',
                  refresh_expires_in: Date.now(),
                },
              },
            });
          }}
        >
          <span>EVENT</span>
        </Item>
      ),
    },
    {
      item: (
        <Item
          className="flex align-center gaps"
          onClick={() => this.navigate(addRoute)}
        >
          <ContainerCloudIcon
            fill={itemColor}
            title={strings.extension.statusBar['label']()}
          />
        </Item>
      ),
    },
  ];

  onProtocolClusters = ({ search }) => {
    let tokens;
    try {
      tokens = JSON.parse(atob(search.tokens));
    } catch (err) {
      // eslint-disable-next-line no-console -- log error
      console.error(
        `[${pkg.name}/renderer/onProtocolClusters] ERROR: Failed to decode tokens, error="${err.message}"`,
        err
      );
      return;
    }

    this.navigate(addRoute);

    dispatchExtEvent({
      type: EXT_EVENT_CLUSTERS,
      data: {
        username: search.username,
        baseUrl: search.baseUrl,
        tokens,
      },
    });
  };

  onProtocolKubeConfig = ({ search }) => {
    let kubeConfig;
    try {
      kubeConfig = JSON.parse(atob(search.kubeConfig));
    } catch (err) {
      // eslint-disable-next-line no-console -- log error
      console.error(
        `[${pkg.name}/renderer/onProtocolKubeConfig] ERROR: Failed to decode kubeConfig, error="${err.message}"`,
        err
      );
      return;
    }

    this.navigate(addRoute);

    dispatchExtEvent({
      type: EXT_EVENT_KUBECONFIG,
      data: {
        namespace: search.namespace,
        clusterName: search.clusterName,
        clusterId: search.clusterId,
        kubeConfig,
      },
    });
  };

  onActivate() {
    // DEBUG TODO: TSC complaining it doesn't know about `onProtocolRequest` on the base class...
    // this.onProtocolRequest(`/${EXT_EVENT_CLUSTERS}`, this.onProtocolClusters);
    // this.onProtocolRequest(`/${EXT_EVENT_KUBECONFIG}`, this.onProtocolKubeConfig);
  }
}
