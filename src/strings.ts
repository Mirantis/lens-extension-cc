//
// User-facing strings, to (at least) keep them all in one place in case we
//  might want to localize this extension in the future.
//
// NOTE: Every property should be a function that returns a string. The function
//  can optionally accept tokens as arguments to use in the generated string.
//

import pkg from '../package.json';
import {
  companyName,
  mccCodeName,
  mccShortName,
  mccFullName,
  mkeCodeName,
} from './constants';

export type Prop = (...tokens: any[]) => string;

export interface Dict {
  // NOTE: not fighting this any more, `Dict | Prop` seems like it should work as a recursive
  //  structure, but somehow it's only good down to the 3rd depth, then TypeScript starts to
  //  think some property doesn't exist, and that's really annoying; moving on...
  [index: string]: any;
}

// owner info to add to all posted notifications; does NOT start/end with a space
export const noteOwner = `(${pkg.name})`;

// strings for main, renderer, and page modules
export const extension: Dict = {
  topBar: {
    label: () => mccFullName,
  },
  legacy: {
    kubeConfigProtocol: () =>
      `The "Add cluster to Lens" feature is no longer supported. The extension uses a new synchronization feature to automatically add your clusters (and more) to the Lens Catalog. Get started by adding your management cluster(s) to the extension by clicking on the "${mccFullName}" item in the Lens top bar.`,
    addClustersProtocol: () =>
      `The "Add clusters to Lens" feature is no longer supported. The extension uses a new synchronization feature to automatically add your clusters (and more) to the Lens Catalog. Get started by adding your management cluster(s) to the extension by clicking on the "${mccFullName}" item in the Lens top bar.`,
  },
};

export const closeButton: Dict = {
  label: () => 'Close',
  title: () => 'ESC',
};
export const connectionBlock: Dict = {
  title: () => `Add a ${mccFullName} Management Cluster to Lens`,
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

export const addCloudInstance = {
  connectionError: () =>
    'An error occurred while connecting to the management cluster and retrieving its projects. Click on the Connect button to try again.',
};

export const synchronizeBlock = {
  title: () => 'Select projects to synchronize',
  synchronizeButtonLabel: () => 'Synchronize selected projects',
  synchronizeFutureProjects: () => 'Synchronize future projects',
  checkAllCheckboxLabel: () => 'Project name',
  noProjectsFound: () =>
    'No projects found. At least one project is required for syncing. Try another management cluster.',
  checkboxesDropdownLabels: {
    clusters: () => 'clusters',
    sshKeys: () => 'SSH keys',
    credentials: () => 'credentials',
  },
  error: {
    noProjects: () => 'Select at least one project to sync',
  },
  warning: () =>
    'Synchronizing a large number of projects can cause performance issues',
};

export const syncView: Dict = {
  title: () => `${mccFullName} management clusters`,
  cancelButtonLabel: () => 'Cancel',
  synchronizeProjectsButtonLabel: () => 'Synchronize selected projects',
  syncButtonLabel: () => 'Selective sync...',
  connectButtonLabel: () => 'Connect new Management Cluster',
  autoSync: () => 'Auto-sync',
};

export const managementClusters = {
  table: {
    thead: {
      name: () => 'Name',
      url: () => 'URL',
      username: () => 'Username',
      autosync: () => 'Auto-sync',
      status: () => 'Status',
    },
    tbodyDetailedInfo: {
      clusters: () => 'clusters',
      sshKeys: () => 'SSH keys',
      credentials: () => 'credentials',
      proxies: () => 'proxies',
      licenses: () => 'licenses',
    },
  },
};

export const dataCloud: Dict = {
  error: {
    fetchErrorsOccurred: () =>
      'At least one error occurred while fetching resources',
  },
};

export const apiUtil: Dict = {
  error: {
    sessionExpired: () => 'Session expired',
    invalidCredentials: () => 'Invalid credentials',
    noTokens: () => 'Access token is missing',
    invalidResourceType: (type) =>
      `Unknown or unmapped resource type "${type}"`,
  },
};

export const netUtil: Dict = {
  error: {
    requestFailed: (url = 'unknown', error) =>
      `Network request to ${url} failed.${error ? ` ${error}` : ''}`,
    invalidResponseData: (url = 'unknown', error) =>
      `Failed to extract response data for ${url}: ${
        error || 'Invalid response format.'
      }`,
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
    failedUserPerms: (resourceType = 'unknown') =>
      `Failed to get user permissions for ${resourceType}`,
    failedProjectPerms: () => 'Failed to get user permissions for projects',
    failedToGet: (resourceType = 'unknown') => `Failed to get ${resourceType}`,
    failedToGetList: (resourceType = 'unknown') =>
      `Failed to get ${resourceType} collection`,
    failedToCreate: (resourceType = 'unknown') =>
      `Failed to create ${resourceType}`,
    failedToUpdate: (resourceType = 'unknown') =>
      `Failed to update ${resourceType}`,
    failedToDelete: (resourceType = 'unknown') =>
      `Failed to delete ${resourceType}`,
  },
};

/** Generic API resource-related strings. */
export const apiResource: Dict = {
  notice: {
    helmNotReady: () => 'Helm charts are not ready.',
  },
  status: {
    unknown: () => 'Unknown',
    pending: () => 'Pending', // cluster or machine isn't fully ready yet, might have an error
    ready: () => 'Ready', // cluster or machine ready status
  },
};

export const renderer: Dict = {
  clusterActions: {
    error: {
      clusterNotFound: (name) =>
        `The ${name} cluster was not found in Lens. Try adding it first.`,
    },
  },
};

export const catalog: Dict = {
  entities: {
    // for all entity types
    common: {
      // 3-dots context menu on specific entity
      contextMenu: {
        browserOpen: {
          title: () => 'Open in browser',
        },
      },

      // details panel
      details: {
        title: () => mccFullName,
        unknownValue: () => '<Unknown>', // when a value is null/undefined/empty
        emptyValue: () => '--',
        props: {
          dateCreated: () => 'Date created',
          lastSync: () => 'Last sync',
          namespace: () => 'Project',
          uid: () => 'UID',
          serverStatus: () => `${mccCodeName} status`,
          lensExtension: () => 'Lens Extension',
        },
      },
    },

    cluster: {
      // NOTE: this is a native Lens category/entity type which we're extending
      //  so there's no need for `categoryName`

      // big blue contextual "+" button when viewing the Catalog
      catalogMenu: {
        create: {
          title: () => `New ${mccCodeName} cluster...`,
        },
      },

      // 3-dots context menu on specific entity
      contextMenu: {
        settings: {
          title: () => 'Settings',
        },
        browserOpen: {
          title: () => 'Open in browser',
        },
      },

      // details panel
      details: {
        props: {
          managementCluster: () => 'Management cluster',
          isManagementCluster: (isManagementCluster) =>
            isManagementCluster ? 'Yes' : 'No',
          url: () => 'URL',
          region: () => 'Region',
          provider: () => 'Provider',
          release: () => 'Release',
          managers: () => 'Managers',
          workers: () => 'Workers',
          dashboardUrl: () => `${mkeCodeName} dashboard`,
          lma: () => `${companyName} StackLight`,
          lmaEnabled: () => 'StackLight enabled',
          isLmaEnabled: (enabled) => (enabled ? 'Yes' : 'No'),
          alertaUrl: () => 'Alerta',
          alertManagerUrl: () => 'Alert Manager',
          grafanaUrl: () => 'Grafana',
          kibanaUrl: () => 'Kibana',
          prometheusUrl: () => 'Prometheus',
          telemeterServerUrl: () => 'Telemeter Server',
        },
      },
    },

    sshKey: {
      categoryName: () => `${mccCodeName} SSH Keys`,

      // big blue contextual "+" button when viewing the Catalog
      catalogMenu: {
        create: {
          title: () => `New ${mccCodeName} SSH Key...`,
        },
      },

      // details panel
      details: {
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
          title: () => `New ${mccCodeName} Credential...`,
        },
      },

      // details panel
      details: {
        props: {
          provider: () => 'Provider',
          region: () => 'Region',
        },
        info: {
          status: (valid) => (valid ? 'Valid' : 'Invalid'),
        },
      },
    },

    proxy: {
      categoryName: () => `${mccCodeName} Proxies`,

      // big blue contextual "+" button when viewing the Catalog
      catalogMenu: {
        create: {
          title: () => `New ${mccCodeName} Proxy...`,
        },
      },

      // details panel
      details: {
        props: {
          region: () => 'Region',
          httpProxy: () => 'HTTP Proxy',
          httpsProxy: () => 'HTTPS Proxy',
        },
      },
    },

    license: {
      categoryName: () => `${mccCodeName} RHEL Licenses`,

      // big blue contextual "+" button when viewing the Catalog
      catalogMenu: {
        create: {
          title: () => `New ${mccCodeName} RHEL License...`,
        },
      },
    },
  },
};

export const clusterPage: Dict = {
  menuItems: {
    group: () => mccShortName,
    overview: () => 'Overview',
    events: () => 'Events',
    history: () => 'History',
    details: () => 'Details',
  },
  common: {
    emptyValue: catalog.entities.common.details.emptyValue,
    clusterUrl: () => 'Cluster URL',
  },
  pages: {
    overview: {
      summary: {
        title: () => 'Summary',
        clusterName: () => 'Name',
        serverStatus: catalog.entities.common.details.props.serverStatus,
        lastSync: catalog.entities.common.details.props.lastSync,
        provider: catalog.entities.cluster.details.props.provider,
        managementCluster:
          catalog.entities.cluster.details.props.managementCluster,
        isManagementCluster:
          catalog.entities.cluster.details.props.isManagementCluster,
        releaseVersion: catalog.entities.cluster.details.props.release,
        namespace: catalog.entities.common.details.props.namespace,
        clusterObjects: {
          title: () => 'Cluster objects',
          credentials: (count) => (count === 1 ? 'Credential' : 'Credentials'),
          sshKeys: (count) => (count === 1 ? 'SSH key' : 'SSH keys'),
          rhelLicenses: (count) =>
            count === 1 ? 'RHEL license' : 'RHEL licenses',
          proxies: (count) => (count === 1 ? 'Proxy' : 'Proxies'),
        },
      },
      clusterConditions: {
        title: () => 'Cluster Conditions',
        noStatus: () => 'No status information available',
      },
    },
    details: {
      generalInformation: {
        title: () => 'General information',
        name: () => 'Name',
        namespace: catalog.entities.common.details.props.namespace,
        source: () => 'Source',
        status: catalog.entities.common.details.props.serverStatus,
        lastSync: catalog.entities.common.details.props.lastSync,
        labels: () => 'Labels',
      },
      kubernetesInformation: {
        title: () => 'Kubernetes information',
        distribution: () => 'Distribution',
        kubeletVersion: () => 'Kubelet Version',
      },
      serverInformation: {
        title: () => mccFullName,
        uid: catalog.entities.common.details.props.uid,
        dateCreated: catalog.entities.common.details.props.dateCreated,
        isManagementCluster:
          catalog.entities.cluster.details.props.isManagementCluster,
        managementCluster:
          catalog.entities.cluster.details.props.managementCluster,
        region: catalog.entities.cluster.details.props.region,
        provider: catalog.entities.cluster.details.props.provider,
        release: catalog.entities.cluster.details.props.release,
        managers: catalog.entities.cluster.details.props.managers,
        workers: catalog.entities.cluster.details.props.workers,
        dashboardUrl: catalog.entities.cluster.details.props.dashboardUrl,
      },
      lmaInformation: {
        lmaEnabled: catalog.entities.cluster.details.props.lmaEnabled,
        isLmaEnabled: catalog.entities.cluster.details.props.isLmaEnabled,
        title: catalog.entities.cluster.details.props.lma,
        alerta: catalog.entities.cluster.details.props.alertaUrl,
        alertManager: catalog.entities.cluster.details.props.alertManagerUrl,
        grafana: catalog.entities.cluster.details.props.grafanaUrl,
        kibana: catalog.entities.cluster.details.props.kibanaUrl,
        prometheus: catalog.entities.cluster.details.props.prometheusUrl,
      },
    },
    events: {
      title: () => 'Events',
      itemsAmount: (count) => `${count} ${count === 1 ? 'item' : 'items'}`,
      defaultSourceOption: () => 'All sources',
      searchPlaceholder: () => 'Search events...',
      table: {
        headers: {
          type: () => 'Type',
          date: () => 'Date',
          message: () => 'Message',
          source: () => 'Source',
          machine: () => 'Machine',
          count: () => 'Count',
        },
        emptyList: () => 'No events available',
        noEventsFound: () => 'No events found',
        resetSearch: () => 'Reset search',
      },
    },
  },
};

export const welcome: Dict = {
  titleHtml: () => `Welcome to the <br/>${mccFullName} for Lens Extention`,
  description: () =>
    `This extension enables you to connect to multiple ${mccFullName} management clusters through Lens. You can now leverage Lens for basic lifecycle management operations such as:`,
  listItems: () => [
    'Synchronizing projects to view their resources in the Lens Catalog',
    'Monitoring real-time cluster status and resource utilization in Lens',
    'Filtering synced resources and viewing their details in the Lens Catalog',
  ],
  link: {
    label: () => 'And more!',
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

export const connectionStatuses: Dict = {
  cloud: {
    connected: () => 'Connected',
    connecting: () => 'Connecting...',
    disconnected: () => 'Disconnected',
    updating: () => 'Updating...',
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
      messageHtml: (
        cloudName,
        projects // `projects` is `Array<string|Namespace>`
      ) =>
        `
        <p>Removing management cluster “${cloudName}” will also remove the following projects and their associated catalog items${
          projects.length > 0 ? ':' : '.'
        }</p>
        ${
          projects.length > 0
            ? `<ul style="padding: 12px 12px 12px 26px; list-style: disc;">
            ${projects
              .map(
                (project) => `<li>${project.name ? project.name : project}</li>`
              )
              .join('')}
          </ul>`
            : '<p style="margin-bottom: 12px;"></p>'
        }
        <p>Are you sure you want to continue?</p>
        `,
      confirmButtonLabel: () => 'Yes',
    },
  },
  namespace: {
    openInBrowser: () => 'Open in browser',
    createCluster: () => 'Create cluster',
  },
};

export const wizard: Dict = {
  back: () => 'Back',
  next: () => 'Next',
  finish: () => 'Finish',
};

export const createClusterWizard: Dict = {
  title: () => 'Create new cluster',
  lastLabel: () => 'Create cluster',
  steps: {
    general: {
      stepTitle: () => 'General',
      chooseProvider: () => 'Choose your provider',
      providerRequirements: () => 'Provider requirements',
      fields: {
        clusterNameLabel: () => 'Cluster name',
      },
    },
    provider: {
      stepLabel: () => 'Provider', // same for all providers
      equinix: {
        stepTitle: () => 'Equinix provider settings',
        fields: {
          facilityLabel: () => 'Facility',
          vlanIdLabel: () => 'VLAN ID',
        },
      },
    },
    cluster: {
      stepTitle: () => 'Cluster settings',
      fields: {},
    },
    monitor: {
      stepTitle: () => 'StackLight monitoring',
      stepLabel: () => 'Monitoring',
      fields: {},
    },
    node: {
      stepTitle: () => 'Node pools',
      stepLabel: () => 'Nodes',
      fields: {},
    },
  },
};
