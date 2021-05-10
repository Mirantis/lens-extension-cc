//
// User-facing strings, to (at least) keep them all in one place in case we
//  might want to localize this extension in the future.
//
// NOTE: Every property should be a function that returns a string. The function
//  can optionally accept tokens as arguments to use in the generated string.
//

import { workspacePrefix } from './constants';
import pkg from '../package.json';

export type Prop = (...tokens: any[]) => string;

export interface Dict {
  [index: string]: Dict | Prop;
}

// owner info to add to all posted notifications; does NOT start/end with a space
export const noteOwner = `(${pkg.name})`;

export const mccShortName = 'Container Cloud';
export const mccFullName = `Mirantis ${mccShortName}`;

// strings for main, renderer, and page modules
export const extension: Dict = {
  appMenu: {
    label: () => 'Add Cloud Clusters',
  },
  statusBar: {
    label: () => mccFullName,
  },
};

export const view: Dict = {
  main: {
    titles: {
      generic: () => `Add ${mccFullName} Clusters`,
      kubeConfig: () => `Adding ${mccFullName} Cluster`,
      activateCluster: () => `Activate ${mccFullName} Cluster`,
    },
    loaders: {
      activateCluster: (name) => `Activating ${name} cluster...`,
      addClustersHtml: (url) =>
        `Retrieving clusters from <code>${url}</code>...`,
      addKubeCluster: (name) => `Adding ${name} cluster...`,
    },
    kubeConfigEvent: {
      error: {
        invalidEventData: () =>
          `The data provided for adding the cluster is invalid. Make sure the ${mccShortName} instance is compatible with this extension and try again.`,
      },
      clusterAdded: (name) =>
        `The ${name} cluster was successfully added to Lens.`,
      clusterSkipped: (name) => `The ${name} cluster was already in Lens.`,
    },
    activateClusterEvent: {
      error: {
        invalidEventData: () =>
          `The data provided for activating the cluster is invalid. Make sure the ${mccShortName} instance is compatible with this extension and try again.`,
      },
      clusterActivated: (name) => `The ${name} cluster was activated.`,
    },
    addClustersEvent: {
      error: {
        invalidEventData: () =>
          `The data provided for adding clusters is invalid. Make sure the ${mccShortName} instance is compatible with this extension and try again.`,
      },
    },
    close: () => 'Reset back to normal view',
  },
  help: {
    html: () =>
      `
<h2>Adding Clusters</h2>
<p>
  This extension makes it easy to add clusters from a ${mccFullName} instance.
</p>
<p>
  When clusters are added, <code>kubeConfig</code> files are automatically generated
  for each cluster, and stored in the configured directory. Do not remove the generated
  files (unless you remove the pertaining cluster from Lens) because Lens references
  them whenever a related cluster is activated.
</p>
<h3>Workspaces</h3>
<p>
  By default, clusters are added to new workspaces that match their ${mccShortName} namespace
  names with an added <code>${workspacePrefix}</code> prefix.
</p>
<p>
  For example, if a cluster from a <code>demo</code> namespace is added, it will
  be added to the <code>${workspacePrefix}demo</code> workspace (and the workspace will be
  created if it doesn't exist already).
</p>
<h2>Links</h2>
<p>
  When activating this extension via links from a ${mccFullName} instance (requires Lens
  4.2 or later), the extension UI will add an X (Close) button to the top/right corner
  of its main panel in certain cases. Click the Close button to return to the default view.
</p>
`,
  },
};

export const login: Dict = {
  title: () => 'Get clusters',
  url: { label: () => 'Instance URL:' },
  sso: {
    messageHtml: () =>
      `<strong>SSO Authentication:</strong> Your default browser should open to the ${mccShortName} sign in page, if you aren't already signed in. Once you have signed-in, your browser will prompt you to open Lens. Be sure to accept in order to complete the process. Once you have opted to open Lens, the browser window can be closed.`,
  },
  action: {
    connect: () => 'Connect',
    refresh: () => 'Refresh',
    ssoCancel: () => 'Cancel',
  },
  error: {
    basicAuth: () =>
      'This instance uses basic authentication (username and password for access), which is not supported by this extension. Please connect to an instance that uses Keycloak SSO authentication.',
  },
};

export const configProvider: Dict = {
  error: {
    unexpectedToken: () =>
      "A problem occurred while retrieving the instance's configuration details. Make sure the instance URL is correct.",
  },
};

export const ssoAuthProvider: Dict = {
  error: {
    basicOnly: () =>
      `The specified ${mccShortName} instance requires basic authentication, which is not supported by this extension. Only instances that use SSO (Keycloak-based) authentication are supported.`,
    authCode: () =>
      `Authorization with the ${mccShortName} instance failed. Try again, and be sure to use the correct SSO account.`,
    userCanceled: () => 'User canceled SSO authorization process.',
  },
};

export const clusterList: Dict = {
  title: () => 'Select clusters',
  notReady: () => '(not ready)',
  onlyNamespaces: (namespaces = []) =>
    `Showing only the following namespaces: ${namespaces.join(', ')}`,
  ssoLimitationHtml: () =>
    'Selection is currently <strong>limited to a single cluster</strong> because of technical limitations with using SSO authorization to generate a unique kubeConfig per cluster.',
  action: {
    selectAll: {
      label: () => 'Select all',
    },
    selectNone: {
      label: () => 'Select none',
    },
  },
};

export const addClusters: Dict = {
  title: () => 'Add to Lens',
  sso: {
    messageHtml: () =>
      `<strong>This instance uses SSO:</strong> Your default browser should open to the ${mccShortName} sign in page, if you aren't already signed in. Once you have signed-in, your browser will prompt you to open Lens. Be sure to accept in order to complete the process. Once you have opted to open Lens, the browser window can be closed.`,
  },
  action: {
    label: () => 'Add selected clusters',
    disabledTip: () => 'Select at least one cluster to add',
    ssoCancel: () => 'Cancel',
  },
};

export const preferencesPanel: Dict = {
  title: () => 'Extension Preferences',
  location: {
    label: () => 'Location',
    tip: () =>
      'Directory where new kubeConfig files created by this extension will be stored and read by Lens. Existing kubeConfig files will remain where they were last stored and Lens will continue accessing them from there.',
    icon: () => 'Browse',
    message: () => 'Choose kubeConfig file location',
    action: () => 'Use location',
  },
  addToNew: {
    label: () => 'Add to new workspaces',
    tipOn: () =>
      `Add clusters to new workspaces that correlate to their original ${mccShortName} namespaces`,
    tipOff: () => 'Add clusters to the active workspace',
  },
  offline: {
    label: () => 'Offline use',
    tip: () =>
      'Generating tokens for offline use is less secure because they will never expire',
  },
  saved: () => 'Preferences saved!',
};

export const clusterDataProvider: Dict = {
  error: {
    invalidNamespacePayload: () =>
      'Failed to parse namespace payload: Unexpected data format.',
    invalidClusterPayload: () =>
      'Failed to parse cluster payload: Unexpected data format.',
  },
};

export const clusterActionsProvider: Dict = {
  error: {
    kubeConfigCreate: (clusterId = 'unknown') =>
      `Failed to create kubeConfig for cluster ${clusterId}`,
    kubeConfigSave: (clusterId = 'unknown') =>
      `Failed to save kubeConfig file to disk for cluster ${clusterId}`,
    clusterNotFound: (name) =>
      `The ${name} cluster was not found in Lens. Try adding it first.`,
    sso: {
      addClustersUserCanceled: () =>
        'The operation to add clusters was canceled by the user during the SSO authorization process.',
      authCode: (clusterId) =>
        `Authorization for cluster ${clusterId} with the ${mccShortName} instance failed. Try again, and be sure to use the correct SSO account.`,
    },
  },
  workspaces: {
    description: () => `${mccFullName} workspace`,
  },
  notifications: {
    newWorkspacesHtml: (names = []) =>
      `New workspaces created: ${names
        .map((name) => `<strong>${name}</strong>`)
        .join(', ')} <em>${noteOwner}</em>`,
    newClustersHtml: (names = []) =>
      `New clusters added: ${names
        .map((name) => `<strong>${name}</strong>`)
        .join(', ')} <em>${noteOwner}</em>`,
    workspaceActivatedHtml: (name = '') =>
      `Activated the <strong>${name}</strong> workspace. <em>${noteOwner}</em>`,
    skippedClusters: (names = []) =>
      `Some clusters were <strong>skipped</strong> because they were already in Lens: ${names
        .map((name) => `<strong>${name}</strong>`)
        .join(', ')} <em>${noteOwner}</em>`,
  },
};

export const authUtil: Dict = {
  error: {
    sessionExpired: () => 'Session expired',
    invalidCredentials: () => 'Invalid credentials',
  },
};

export const netUtil: Dict = {
  error: {
    requestFailed: (url = 'unknown') => `Network request to ${url} failed`,
    invalidResponseData: (url = 'unknown') =>
      `Extracting response data for ${url} failed: Invalid response format.`,
    reason: (message = '') => `Reason: "${message}"`,
    serverResponse: (statusText = '') => `Server response: "${statusText}".`,
    responseCode: (status = -1) => `Server response code: ${status}`,
  },
};

export const apiClient: Dict = {
  error: {
    failedToGetToken: () => 'Failed to get token',
    failedToRefreshToken: () => 'Failed to refresh token',
    failedToLogout: () => 'Failed to log out',
    failedUserPerms: (entity = 'unknown') =>
      `Failed to get user permissions for "${entity}"`,
    failedProjectPerms: () => 'Failed to get user permissions for projects',
    failedToGet: (entity = 'unknown') => `Failed to get ${entity}`,
    failedToGetList: (entity = 'unknown') => `Failed to get ${entity} list`,
    failedToCreate: (entity = 'unknown') => `Failed to create ${entity}`,
    failedToUpdate: (entity = 'unknown') => `Failed to update ${entity}`,
    failedToDelete: (entity = 'unknown') => `Failed to delete ${entity}`,
  },
};
