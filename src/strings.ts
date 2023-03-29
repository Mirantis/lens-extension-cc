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
  trustHost: {
    label: () => 'Trust this host',
    help: () =>
      'By trusting this host, TLS verification will be disabled (only applies to secure connections using HTTPS)',
    warning: () =>
      'This is unsafe. Note that untrusting the host in the future will require the management cluster to be removed and re-added without this option.',
  },
  offlineAccess: {
    label: () => 'Use offline tokens',
    help: () =>
      'Less secure as long-lived tokens will not require re-authentication as often',
  },
  button: {
    label: () => 'Connect',
  },
  notice: {
    info: () =>
      "You will be directed to your Management Cluster's login page through your web browser where you should enter your SSO credentials",
    urlAlreadyUsed: () => 'This Management Cluster is already being synced',
    urlIncorrectFormat: () => 'Incorrect URL format',
    urlUnsupportedProtocol: () => 'Unsupported protocol: Must be HTTP or HTTPS',
    nameSymbolsAreNotValid: () =>
      'The name cannot contain whitespace or special characters, except for hyphens (-) and underscores (_)',
    nameAlreadyUsed: () =>
      'A Management Cluster with this name is already being synced',
  },
};

export const cloudConnectionErrors = {
  connectionError: () =>
    'An error occurred while connecting to the management cluster. Check your network connection, make sure your VPN is active (if it is required to access the host), and try connecting again.',
  hostNotFound: () =>
    'The management cluster cannot be reached. Check your network connection, make sure your VPN is active (if it is required to access the host), and try connecting again.',
  untrustedCertificate: () =>
    'The management cluster appears to be using a self-signed certificate which cannot be verified. If you trust the host, enable the "Trust this host" option and try connecting again.',
};

export const synchronizeBlock = {
  title: () => 'Select projects to synchronize',
  synchronizeButtonLabel: () => 'Synchronize selected projects',
  synchronizeFutureProjects: () => 'Synchronize future projects',
  useOfflineTokens: () => 'Use offline tokens',
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

  trustHostModal: {
    title: () => 'Configure trusted hosts',
    callLabel: () => 'Save',
    deprecationHtml: () =>
      'The command line option <code>LEX_CC_UNSAFE_ALLOW_SELFSIGNED_CERTS</code> was <strong>deprecated</strong> in v5.5.0 and will be removed in the next major release of this extension. <strong>This flag should no longer be used.</strong>',
    newfeatureHtml: () =>
      'A new option to <strong>trust the host</strong> is now provided when adding a new management cluster. See <a href="#1">Trusted hosts</a> for details.',
    promptHtml: () =>
      'Choose which management clusters should be trusted. If you do nothing, they will be treated as <strong>untrusted</strong> and will fail to connect (e.g. if they use self-signed certificates).',
  },
};

export const modal = {
  defaultCallLabel: () => 'OK',
  defaultCancelLabel: () => 'Cancel',
};

export const managementClusters = {
  table: {
    thead: {
      name: () => 'Name',
      url: () => 'URL',
      username: () => 'Username',
      autoSync: () => 'Auto-sync',
      offlineAccess: () => 'Offline tokens',
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

export const metricApi: Dict = {
  error: {
    noTokens: apiUtil.error.noTokens,
    instantQueryFailure: () => 'Failed to execute instant query',
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
    unauthorized: () => 'Unauthorized',
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
    resetSearch: () => 'Reset search',
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
      health: {
        title: () => 'Health',
        showMore: () => '(Show more)',
        showLess: () => '(Show less)',
        metrics: {
          error: {
            disconnectedManagementCluster: {
              title: () =>
                'Health metrics cannot be displayed for this cluster because its management cluster is disconnected.',
              reconnectButtonLabel: () => 'Reconnect',
            },
            noMetrics: {
              title: () =>
                'Health metrics cannot be displayed for this cluster for one of the following reasons:',
              reasonsList: () => [
                'Stacklight is disabled.',
                'Stacklight service is not available.',
              ],
            },
            hostNotFound: {
              title: (url) => `The Prometheus API (${url}) cannot be reached.`,
              more: () =>
                'Check your network connection, make sure your VPN is active (if it is required to access the host), make sure the service is enabled via StackLight, and re-open this cluster page.',
            },
            untrustedCertificate: {
              title: (url) =>
                `The Prometheus API (${url}) appears to be using a self-signed certificate which cannot be verified.`,
              more: (cloudName) =>
                `If you trust the host, the management cluster (${cloudName}) itself must be trusted. Remove it from the extension and then re-add it, making sure the "Trust this host" option is enabled when you do (and syncing the same projects as before). Then try re-opening this cluster page.`,
            },
            unknownError: {
              title: () =>
                'An unknown network error occurred while fetching metrics. Try re-opening this cluster page again.',
            },
          },
          cpu: {
            title: () => 'CPU',
            used: () => 'Used',
            system: () => 'System',
            io: () => 'I/O',
            idle: () => 'Idle',
            tooltipInfoHtml: () => `
              <ul>
                <li>- Used (%): 1-minute average time spent performing tasks, across the cluster.</li>
                <li>- System (%): 1-minute average time spent in the kernel, across the cluster.</li>
                <li>- I/O (%): 1-minute average time spent waiting for I/O, meaning system was disk- or network-bound, across the cluster.</li>
                <li>- Idle (%): 1-minute average idle time not performing tasks, across the cluster.</li>
              </ul>
              <p>* Metrics are retrieved from the kubernetes cluster and may differ from OS level metrics.</p>
            `,
            percentageValue: (percentage) => `${percentage}%`,
          },
          memory: {
            title: () => 'Memory',
            available: () => 'Available',
            capacity: () => 'Capacity',
            allocated: () => 'Allocated',
            tooltipInfoHtml: () => `
              <ul>
                <li>- Available (GB): Total availability for starting new applications, without the need for swapping, across the cluster.</li>
                <li>- Capacity (GB): Total memory including available and allocated, across the cluster.</li>
                <li>- Allocated (GB): Total memory currently in use by both the OS and running applications, across the cluster.</li>
              </ul>
              <p>* Metrics are retrieved from the kubernetes cluster and may differ from OS level metrics.</p>
            `,
          },
          storage: {
            title: () => 'Storage',
            used: () => 'Used',
            capacity: () => 'Capacity',
            available: () => 'Available',
            tooltipInfoHtml: () => `
              <ul>
                <li>- Capacity (GB): Total disk space across the cluster.</li>
                <li>- Available (GB): Total free disk space across the cluster.</li>
                <li>- Used (GB): Total consumed disk space across the cluster.</li>
              </ul>
              <p>* Metrics are retrieved from the kubernetes cluster and may differ from OS level metrics.</p>
            `,
          },
          sizes: {
            bytes: () => 'Bytes',
            kb: () => 'KB',
            mb: () => 'MB',
            gb: () => 'GB',
            tb: () => 'TB',
            pb: () => 'PB',
            eb: () => 'EB',
            zb: () => 'ZB',
            yb: () => 'YB',
          },
          chart: {
            chartFillPercentage: (percentage) => `${percentage}%`,
          },
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
      },
    },
    history: {
      title: () => 'History',
      itemsAmount: (count) => `${count} ${count === 1 ? 'item' : 'items'}`,
      searchPlaceholder: () => 'Search Upgrade History...',
      table: {
        headers: {
          status: () => 'Status',
          date: () => 'Date',
          name: () => 'Name',
          message: () => 'Message',
          machine: () => 'Machine',
          fromRelease: () => 'From Release',
          toRelease: () => 'To Release',
        },
        emptyList: () => 'No upgrade history available',
        noHistoryFound: () => 'No upgrade history found',
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
