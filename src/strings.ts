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

// strings for main, renderer, and page modules
export const extension: Dict = {
  appMenu: {
    label: () => 'Add Cloud Clusters',
  },
  statusBar: {
    label: () => 'Mirantis Container Cloud',
  },
};

export const view: Dict = {
  main: {
    titles: {
      generic: () => 'Add Mirantis Container Cloud Clusters',
      kubeConfig: () => 'Adding Mirantis Container Cloud Cluster',
      activateCluster: () => 'Activate Mirantis Container Cloud Cluster',
    },
    loaders: {
      activateCluster: (name) => `Activating ${name} cluster...`,
      addClustersHtml: (url) =>
        `Retrieving clusters from <code>${url}</code>...`,
      addKubeCluster: (name) => `Adding ${name} cluster...`,
    },
    kubeConfigEvent: {
      clusterAdded: (name) =>
        `The ${name} cluster was successfully added to Lens.`,
      clusterSkipped: (name) => `The ${name} cluster was already in Lens.`,
    },
    activateClusterEvent: {
      clusterActivated: (name) => `The ${name} cluster was activated.`,
    },
    close: () => 'Reset back to normal view',
  },
  help: {
    html: (showLinkInfo = false) => {
      // TODO: remove parameter and always show info once links supported
      // TRACKING: https://github.com/Mirantis/lens-extension-cc/issues/25
      let text = `
<h2>Adding Clusters</h2>
<p>
  This extension makes it easy to add clusters from a Mirantis Container
  Cloud instance.
</p>
<p>
  When clusters are added, <code>kubeConfig</code> files are automatically generated
  for each cluster, and stored in the configured directory. Do not remove the generated
  files (unless you remove the pertaining cluster from Lens) because Lens references
  them whenever a related cluster is activated.
</p>
<h3>Workspaces</h3>
<p>
  By default, clusters are added to new workspaces that match their MCC namespace
  names with an added <code>${workspacePrefix}</code> prefix.
</p>
<p>
  For example, if a cluster from a <code>demo</code> namespace is added, it will
  be added to the <code>${workspacePrefix}demo</code> workspace (and the workspace will be
  created if it doesn't exist already).
</p>
`;
      text += showLinkInfo
        ? `
<h3>MCC Links</h3>
<p>
  When activating this extension via links from an MCC instance (requires a version
  of Lens that supports <code>lens://</code> protocol requests), the extension
  UI will add an X (Close) button to the top/right corner of its main panel.
  Click the Close button to return to the default view.
</p>
`
        : '';
      return text;
    },
  },
};

export const login: Dict = {
  title: () => 'Sign in',
  url: { label: () => 'MCC URL:' },
  username: { label: () => 'Username:' },
  password: { label: () => 'Password:' },
  action: {
    label: () => 'Get clusters',
  },
};

export const clusterList: Dict = {
  title: () => 'Select clusters',
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
  password: {
    tip: (username) =>
      `Password for user "${username}" is required to generate kubeConfigs`,
  },
  action: {
    label: () => 'Add selected clusters',
    disabledTip: () => 'Select at least one cluster to add',
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
    label: () => 'Add to MCC workspaces',
    tipOn: () =>
      'Add clusters to new workspaces that correlate to their original MCC namespaces',
    tipOff: () => 'Add clusters to the active workspace',
  },
  offline: {
    label: () => 'Offline use',
    tip: () =>
      'WARNING: Generating tokens for offline use is less secure because they will never expire',
  },
  saved: () => 'Preferences saved!',
};

export const clustersProvider: Dict = {
  errors: {
    invalidNamespacePayload: () =>
      'Failed to parse namespace payload: Unexpected data format.',
    invalidNamespace: () =>
      'Encountered at least one namespace with unexpected or missing metadata.',
    invalidClusterPayload: () =>
      'Failed to parse cluster payload: Unexpected data format.',
    invalidCluster: () =>
      'Encountered at least one cluster with unexpected or missing metadata.',
  },
};

export const addClustersProvider: Dict = {
  errors: {
    kubeConfigCreate: (clusterId = 'unknown') =>
      `Failed to create kubeConfig for cluster ${clusterId}`,
    kubeConfigSave: (clusterId = 'unknown') =>
      `Failed to save kubeConfig file to disk for cluster ${clusterId}`,
    clusterNotFound: (name) =>
      `The ${name} cluster was not found in Lens. Try adding it first.`,
  },
  workspaces: {
    description: () => 'MCC workspace',
  },
  notifications: {
    newWorkspacesHtml: (names = []) =>
      `The following new workspaces were created: ${names
        .map((name) => `<strong>${name}</strong>`)
        .join(', ')} <em>${noteOwner}</em>`,
    newClustersHtml: (names = []) =>
      `The following new clusters were added: ${names
        .map((name) => `<strong>${name}</strong>`)
        .join(', ')} <em>${noteOwner}</em>`,
    workspaceActivatedHtml: (name = '') =>
      `The <strong>${name}</strong> workspace has been activated. <em>${noteOwner}</em>`,
    skippedClusters: (names = []) =>
      `The following clusters were <strong>skipped</strong> because they were already in Lens: ${names
        .map((name) => `<strong>${name}</strong>`)
        .join(', ')} <em>${noteOwner}</em>`,
  },
};

export const authUtil: Dict = {
  errors: {
    sessionExpired: () => 'Session expired',
    invalidCredentials: () => 'Invalid credentials',
  },
};

export const netUtil: Dict = {
  errors: {
    requestFailed: (url = 'unknown') => `Network request to ${url} failed`,
    invalidResponseData: (url = 'unknown') =>
      `Extracting response data for ${url} failed: Invalid response format.`,
    reason: (message = '') => `Reason: "${message}"`,
    serverResponse: (statusText = '') => `Server response: "${statusText}".`,
    responseCode: (status = -1) => `Server response code: ${status}`,
  },
};

export const apiClient: Dict = {
  errors: {
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
