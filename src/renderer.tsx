import React from 'react';
import { LensRendererExtension } from '@k8slens/extensions';
import { ContainerCloudIcon, AddClusterPage } from './page';
import * as strings from './strings';
import { mainRoute } from './routes';
import {
  EXT_EVENT_ACTIVATE_CLUSTER,
  EXT_EVENT_ADD_CLUSTERS,
  EXT_EVENT_KUBECONFIG,
  EXT_EVENT_OAUTH_CODE,
  dispatchExtEvent,
} from './eventBus';
import { prefStore } from './cc/store/PreferencesStore';
import { logger } from './util';
import pkg from '../package.json';

const itemColor = 'white'; // CSS color; Lens hard-codes the color of the workspace indicator item to 'white' also

export default class ExtensionRenderer extends LensRendererExtension {
  globalPages = [
    {
      id: mainRoute,
      components: {
        Page: () => <AddClusterPage extension={this} />,
      },
    },
  ];

  // NOTE: mobx and Emotion components apparently don't mix well, and neither do
  //  mobx and plain React components with inline `style` props. Components given
  //  to `statusBarItems` are deeply observed by mobx. If an Emotion component is
  //  present in the hierarchy (or just a regular component with the `style` prop),
  //  mobx goes berserk throws the following exception (or similar):
  // ============
  // Uncaught (in promise) RangeError: Maximum call stack size exceeded
  //     at initializeInstance (mobx.module.js:332)
  //     at isObservableObject (mobx.module.js:4411)
  //     at _isObservable (mobx.module.js:2550)
  //     at isObservable (mobx.module.js:2560)
  //     at deepEnhancer (mobx.module.js:401)
  //     at new ObservableValue (mobx.module.js:1031)
  //     at ObservableObjectAdministration../node_modules/mobx/lib/mobx.module.js.ObservableObjectAdministration.addObservableProp (mobx.module.js:4209)
  //     at mobx.module.js:453
  //     at decorate (mobx.module.js:363)
  //     at decoratorFactory (mobx.module.js:384)
  // ============
  statusBarItems = [
    {
      item: (
        <div
          className="flex align-center gaps"
          title={strings.extension.statusBar['label']()}
          onClick={() => this.navigate(mainRoute)}
        >
          <ContainerCloudIcon fill={itemColor} />
        </div>
      ),
    },
  ];

  protected handleProtocolActivateCluster = ({ search }) => {
    this.navigate(mainRoute);

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

  protected handleProtocolAddClusters = ({ search }) => {
    let tokens;
    try {
      tokens = JSON.parse(atob(search.tokens));
    } catch (err) {
      logger.error(
        'renderer/handleProtocolAddClusters',
        `Failed to decode tokens parameter, error="${err.message}"`,
        err
      );
      return;
    }

    const onlyNamespaces = search.namespaces?.split(',');

    this.navigate(mainRoute);

    dispatchExtEvent({
      type: EXT_EVENT_ADD_CLUSTERS,
      data: {
        cloudUrl: search.cloudUrl,
        keycloakLogin: search.keycloakLogin === 'true',
        onlyNamespaces,
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
      logger.error(
        'renderer/handleProtocolKubeConfig',
        `Failed to decode kubeConfig parameter, error="${err.message}"`,
        err
      );
      return;
    }

    this.navigate(mainRoute);

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

  protected handleProtocolOauthCode = ({ search }) => {
    this.navigate(mainRoute);

    dispatchExtEvent({
      type: EXT_EVENT_OAUTH_CODE,
      data: search,
    });
  };

  async onActivate() {
    this.protocolHandlers = [
      {
        pathSchema: `/${EXT_EVENT_ACTIVATE_CLUSTER}`,
        handler: this.handleProtocolActivateCluster,
      },
      {
        pathSchema: `/${EXT_EVENT_ADD_CLUSTERS}`,
        handler: this.handleProtocolAddClusters,
      },
      {
        pathSchema: `/${EXT_EVENT_KUBECONFIG}`,
        handler: this.handleProtocolKubeConfig,
      },
      {
        pathSchema: `/${EXT_EVENT_OAUTH_CODE}`,
        handler: this.handleProtocolOauthCode,
      },
    ];

    await prefStore.loadExtension(this);
  }
}
