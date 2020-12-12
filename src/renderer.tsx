import React from 'react';
import styled from '@emotion/styled';
import { LensRendererExtension } from '@k8slens/extensions';
import { ContainerCloudIcon, AddClusterPage } from './page';
import * as strings from './strings';
import { addRoute } from './routes';
import {
  EXT_EVENT_ACTIVATE_CLUSTER,
  EXT_EVENT_ADD_CLUSTERS,
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

    a: {
      borderBottom: 'none', // Lens app.css adds a bottom border to anchors without href attributes
    },
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
          <a title={strings.extension.statusBar['label']()}>
            <ContainerCloudIcon fill={itemColor} />
          </a>
        </Item>
      ),
    },
  ];

  protected handleProtocolActivateCluster = ({ search }) => {
    this.navigate(addRoute);

    dispatchExtEvent({
      type: EXT_EVENT_ACTIVATE_CLUSTER,
      data: {
        cloudUrl: search.cloudUrl,
        namespace: search.namespace,
        clusterName: search.clusterName,
        clusterId: search.clusterId,
      },
    });
  };

  protected handleProtocolClusters = ({ search }) => {
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
      type: EXT_EVENT_ADD_CLUSTERS,
      data: {
        cloudUrl: search.cloudUrl,
        username: search.username,
        tokens,
      },
    });
  };

  protected handleProtocolKubeConfig = ({ search }) => {
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
        cloudUrl: search.cloudUrl,
        namespace: search.namespace,
        clusterName: search.clusterName,
        clusterId: search.clusterId,
        kubeConfig,
      },
    });
  };

  onActivate() {
    // TODO remove this HACK once updated type is published that includes the new method;
    //  for how, this just gets around the TSC complaining the method isn't defined on `this`
    // TRACKING: https://github.com/Mirantis/lens-extension-cc/issues/25
    const that = this as any;
    if (typeof that.onProtocolRequest === 'function') {
      that.onProtocolRequest(
        `/${EXT_EVENT_ACTIVATE_CLUSTER}`,
        this.handleProtocolActivateCluster
      );
      that.onProtocolRequest(
        `/${EXT_EVENT_ADD_CLUSTERS}`,
        this.handleProtocolClusters
      );
      that.onProtocolRequest(
        `/${EXT_EVENT_KUBECONFIG}`,
        this.handleProtocolKubeConfig
      );
    } else {
      // eslint-disable-next-line no-console -- log the warning for users
      console.warn(
        `[${pkg.name}/renderer/onActivate] This version of Lens does not support 'lens://' protocol requests.`
      );
    }
  }

  onDeactivate() {
    // TODO remove this HACK once updated type is published that includes the new method;
    //  for how, this just gets around the TSC complaining the method isn't defined on `this`
    // TRACKING: https://github.com/Mirantis/lens-extension-cc/issues/25
    const that = this as any;
    if (typeof that.removeProtocolHandlers === 'function') {
      that.removeProtocolHandlers();
    }
  }
}
