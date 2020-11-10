//
// User-facing strings, to (at least) keep them all in one place in case we
//  might want to localize this extension in the future.
//
// NOTE: Every property should be a function that returns a string. The function
//  can optionally accept tokens as arguments to use in the generated string.
//

export type Prop = (...tokens: string[]) => string;

export interface Dict {
  [index: string]: Dict | Prop;
}

// strings for main, renderer, and page modules
export const extension: Dict = {
  menu: {
    label: () => 'Add Cloud Clusters',
  },
  statusBar: {
    label: () => 'Add Cloud Clusters',
  },
};

export const view: Dict = {
  main: {
    title: () => 'Add Mirantis Container Cloud Clusters',
  },
  help: {
    html: () =>
      `
<h2>Adding Clusters</h2>
<p>
  This extension make it easy to add some or all clusters from an Mirantis Container
  Cloud instance.
</p>
<p>
  When clusters are added, <code>kubeconfig</code> files are automatically generated
  for each cluster, and stored in the configured directory. Do not remove the generated
  files (unless you remove the pertaining cluster from Lens) because Lens references
  them whenever a related cluster is activated.
</p>
`,
  },
};

export const login: Dict = {
  title: () => '1. Sign in to MCC',
  url: { label: () => 'MCC URL:' },
  username: { label: () => 'Username:' },
  password: { label: () => 'Password:' },
  action: {
    label: () => 'Get clusters',
  },
};

export const clusterList: Dict = {
  title: () => '2. Select clusters',
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
  title: () => '3. Add to Lens',
  location: {
    label: () => 'Location',
    tip: () =>
      'Directory where generated kubeconfig files will be stored and read by Lens',
    icon: () => 'Browse',
    message: () => 'Choose kubeconfig file location',
    action: () => 'Use location',
  },
  offline: {
    label: () => 'Offline use (less secure)',
    tip: () =>
      'WARNING: Generating tokens for offline use is less secure because they will never expire',
  },
  action: {
    label: () => 'Add selected clusters',
    disabledTip: () => 'Select at least one cluster to add',
  },
};
