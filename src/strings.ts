//
// User-facing strings, to (at least) keep them all in one place in case we
//  might want to localize this extension in the future.
//
// NOTE: Every property should be a function that returns a string. The function
//  can optionally accept tokens as arguments to use in the generated string.
//

import pkg from '../package.json';

export type Prop = (...tokens: any[]) => string;

export interface Dict {
  // NOTE: not fighting this any more, `Dict | Prop` seems like it should work as a recursive
  //  structure, but somehow it's only good down to the 3rd depth, then TypeScript starts to
  //  think some property doesn't exist, and that's really annoying; moving on...
  [index: string]: any;
}

// owner info to add to all posted notifications; does NOT start/end with a space
export const noteOwner = `(${pkg.name})`;

export const mccCodeName = 'MCC';
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

export const closeButton: Dict = {
  title: () => 'ESC',
};
export const connectionBlock: Dict = {
  title: () => 'Add a Mirantis Container Cloud Management Custer to Lens',
  clusterName: {
    label: () => 'Management Cluster name:',
    placeholder: () =>
      'This name will be used to identify your Management Cluster in Lens',
  },
  clusterUrl: {
    label: () => 'Management Cluster URL:',
  },
  button: {
    label: () => 'Connect',
  },
  notice: {
    info: () =>
      "You will be directed to your Management Cluster's login page through your web browser where you should enter your SSO credentials",
    urlAlreadyUsed: () => 'This Management Cluster is already being synced',
    nameSymbolsAreNotValid: () =>
      'The name cannot contain whitespace or special characters, except for hyphens (-) and underscores (_)',
    nameAlreadyUsed: () =>
      'A Management Cluster with this name is already being synced',
  },
};
export const synchronizeBlock = {
  title: () => 'Select projects to synchronize',
  synchronizeButtonLabel: () => 'Synchronize selected projects',
  checkAllCheckboxLabel: () => 'Project name',
  checkboxesDropdownLabels: {
    clusters: () => 'clusters',
    sshKeys: () => 'SSH keys',
    credentials: () => 'credentials',
  },
  error: {
    noProjects: () => 'Select at least one project to sync',
  },
};

export const syncView: Dict = {
  title: () => 'Mirantis Container Cloud management clusters',
  cancelButtonLabel: () => 'Cancel',
  synchronizeProjectsButtonLabel: () => 'Synchronize selected projects',
  syncButtonLabel: () => 'Selective sync...',
  connectButtonLabel: () => 'Connect new Management Cluster',
};
export const managementClusters = {
  table: {
    thead: {
      name: () => 'Name',
      url: () => 'URL',
      username: () => 'Username',
      status: () => 'Status',
    },
    tbodyDetailedInfo: {
      clusters: () => 'clusters',
      sshKeys: () => 'SSH keys',
      credentials: () => 'credentials',
    },
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
    invalidBrowserUrl: (url) =>
      `Cannot open URL in browser (must be http/s): "${url}"`,
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

export const renderer: Dict = {
  clusterActions: {
    error: {
      clusterNotFound: (name) =>
        `The ${name} cluster was not found in Lens. Try adding it first.`,
    },
  },
  catalog: {
    contextMenuItems: {
      settings: {
        title: () => 'Settings',
      },
      remove: {
        title: () => 'Remove',
        confirm: (cluster) =>
          `Are you sure you want to remove the ${cluster} cluster from Lens? The kubeConfig file NOT be deleted (use the "Delete config" option to also delete it from disk).`,
        error: {
          errorDuringRemove: (cluster) =>
            `An error occurred while attempting to remove the ${cluster} cluster from Lens. See logs for more details.`,
        },
      },
      delete: {
        title: () => 'Delete config',
        confirm: (cluster) =>
          `Are you sure you want to remove the ${cluster} cluster from Lens and delete the kubeConfig file from disk?`,
        error: {
          errorDuringDelete: (cluster) =>
            `An error occurred while attempting remove the ${cluster} cluster from Lens and delete the kubeConfig file. See logs for more details.`,
        },
      },
    },
  },
};

export const clusterPage: Dict = {
  menuItem: () => mccShortName,
  title: () => `${mccFullName} Cluster`,
};

export const clusterView: Dict = {
  infoPanel: {
    viewInBrowser: () => 'View in browser',
  },
};

export const catalog: Dict = {
  entities: {
    cluster: {
      // NOTE: this is a native Lens category/entity type which we're extending
      //  so there's no need for `categoryName`

      // big blue contextual "+" button when viewing the Catalog
      catalogMenu: {
        create: {
          title: () => `New ${mccCodeName} cluster...`,
        },
      },
    },

    sshKey: {
      categoryName: () => `${mccCodeName} SSH Keys`,

      // big blue contextual "+" button when viewing the Catalog
      catalogMenu: {
        create: {
          title: () => 'New SSH Key...',
        },
      },

      // 3-dots context menu on specific entity
      contextMenu: {
        browserOpen: {
          title: () => `Open in ${mccCodeName}`,
        },
      },

      // details panel
      details: {
        title: () => 'More Information',
        props: {
          publicKey: () => 'Public key',
        },
      },
    },

    credential: {
      categoryName: () => `${mccCodeName} Credentials`,

      // big blue contextual "+" button when viewing the Catalog
      catalogMenu: {
        create: {
          title: () => 'New Credential...',
        },
      },

      // 3-dots context menu on specific entity
      contextMenu: {
        browserOpen: {
          title: () => `Open in ${mccCodeName}`,
        },
      },

      // details panel
      details: {
        title: () => 'More Information',
        props: {
          provider: () => 'Provider',
        },
      },
    },

    proxy: {
      categoryName: () => `${mccCodeName} Proxies`,

      // big blue contextual "+" button when viewing the Catalog
      catalogMenu: {
        create: {
          title: () => 'New Proxy...',
        },
      },

      // 3-dots context menu on specific entity
      contextMenu: {
        browserOpen: {
          title: () => `Open in ${mccCodeName}`,
        },
      },

      // details panel
      details: {
        title: () => 'More Information',
        props: {
          region: () => 'Region',
        },
      },
    },
  },
};

export const welcome: Dict = {
  titleHtml: () =>
    'Welcome to the <br/>Mirantis Container Cloud for Lens Extention',
  description: () =>
    'This extension enables you to connect to multiple Mirantis Container Cloud management clusters through Lens. You can now leverage Lens for basic lifecycle management operations such as:',
  listItemsHtml: () => `
    <li>Synchronizing projects to view and manage their resources in the Lens Catalog</li>
    <li>Monitoring real-time cluster status and resource utilization in Lens</li>
    <li>Creating and deleting clusters in your projects from Lens</li>
  `,
  link: {
    label: () => 'And more!',
    href: () =>
      'https://github.com/Mirantis/lens-extension-cc/blob/master/README.md',
  },
  button: {
    label: () => 'Add your first management cluster',
  },
};

export const ssoUtil: Dict = {
  error: {
    ssoNotSupported: () =>
      'The management cluster does not support SSO authorization.',
    invalidSsoUrl: (url) =>
      `The management cluster's Keycloak URL cannot be opened in a browser (must be http/s): "${url}"`,
  },
};

export const cloud: Dict = {
  error: {
    unexpectedToken: () =>
      "A problem occurred while retrieving the management cluster's configuration details. Make sure the management cluster URL is correct.",
  },
};

export const extendedCloud: Dict = {
  error: {
    invalidClusterPayload: () =>
      'Failed to parse Clusters payload: Unexpected data format.',
    invalidNamespacePayload: () =>
      'Failed to parse Namespaces payload: Unexpected data format.',
    invalidCredentialsPayload: () =>
      'Failed to parse Credentials payload: Unexpected data format.',
    invalidSshKeysPayload: () =>
      'Failed to parse SSH Keys payload: Unexpected data format.',
  },
};

export const connectionStatuses: Dict = {
  cloud: {
    connected: () => 'Connected',
    connecting: () => 'Connecting',
    disconnected: () => 'Disconnected',
  },
  namespace: {
    connected: () => 'Synced',
    disconnected: () => 'Not synced',
  },
};

export const contextMenus: Dict = {
  cloud: {
    reconnect: () => 'Reconnect',
    remove: () => 'Remove',
    sync: () => 'Sync now',
    openInBrowser: () => 'Open in browser',
    confirmDialog: {
      messageHtml: (extCloudName, extCloudProjects) =>
        `
        <p>Removing management cluster “${extCloudName}” will also remove the following projects and their associated catalog items${
          extCloudProjects ? ':' : '.'
        }</p>
        ${
          extCloudProjects.length > 0 &&
          `<ul style="padding: 12px 12px 12px 26px; list-style: disc;">
            ${extCloudProjects
              .map(
                (project) => `<li>${project.name ? project.name : project}</li>`
              )
              .join('')}
          </ul>`
        }
        <p>Are you sure you want to continue?</p>
        `,
      confirmButtonLabel: () => 'Yes',
    },
  },
  namespace: {
    sync: () => 'Sync now',
    openInBrowser: () => 'Open in browser',
    createCluster: () => 'Create cluster',
    createSshKey: () => 'Create SHH Key',
    createCredential: () => 'Create Credential',
    createLicense: () => 'Create RHEL License',
    createProxy: () => 'Create Proxy',
  },
};
