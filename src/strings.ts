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
  title: () => 'Add Mirantis Container Cloud Clusters',
};

export const login: Dict = {
  title: () => 'MCC Login',
  url: { label: () => 'MCC URL:' },
  username: { label: () => 'Username:' },
  password: { label: () => 'Password:' },
  action: {
    label: () => 'Get clusters...',
  },
};

export const clusterList: Dict = {
  title: () => 'Available Clusters',
};

export const addClusters: Dict = {
  title: () => 'Add to Lens',
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
    label: () => 'Add selected clusters...',
    disabledTip: () => 'Select at least one cluster to add',
  },
};
