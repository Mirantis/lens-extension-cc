/*
Mock clusters to use in ClusterList view when you don't have full
/src/cc/store/Cluster objects to test with.

For example, set `mockClusters` as the `ClusterList.defaultProps.clusters` value
and then don't provide any clusters to the component's instance)

Or try this in ClusterDataProvider's `_loadData()` method:

```
const data = await mockAsyncClusters();
pr.store.data.namespaces = data.namespaces;
pr.store.data.clusters = data.clusters;
pr.loading = false;
pr.loaded = true;
pr.notifyIfError();
pr.onChange();
return;
```
*/

import { mockNamespaces } from './mockNamespaces';

export const mockClusters = [
  {
    id: '0',
    namespace: mockNamespaces[0].name,
    name: 'cluster-0',
    ready: true,
    deleteInProgress: false,
  },
  {
    id: '1',
    namespace: mockNamespaces[0].name,
    name: 'cluster-1',
    ready: true,
    deleteInProgress: false,
  },
  {
    id: '2',
    namespace: mockNamespaces[0].name,
    name: 'cluster-2',
    ready: true,
    deleteInProgress: false,
  },
  {
    id: '3',
    namespace: mockNamespaces[0].name,
    name: 'cluster-3',
    ready: true,
    deleteInProgress: false,
  },
  {
    id: '4',
    namespace: mockNamespaces[0].name,
    name: 'cluster-4-not-ready',
    ready: false,
    deleteInProgress: false,
  },
  {
    id: '5',
    namespace: mockNamespaces[1].name,
    name: 'cluster-5',
    ready: true,
    deleteInProgress: false,
  },
  {
    id: '6',
    namespace: mockNamespaces[1].name,
    name: 'cluster-6-not-ready',
    ready: false,
    deleteInProgress: false,
  },
  {
    id: '7',
    namespace: mockNamespaces[1].name,
    name: 'cluster-7',
    ready: true,
    deleteInProgress: false,
  },
  {
    id: '8',
    namespace: mockNamespaces[1].name,
    name: 'cluster-8',
    ready: true,
    deleteInProgress: false,
  },
  {
    id: '9',
    namespace: mockNamespaces[1].name,
    name: 'cluster-9',
    ready: true,
    deleteInProgress: false,
  },
  {
    id: '10',
    namespace: mockNamespaces[2].name,
    name: 'cluster-10-not-ready',
    ready: false,
    deleteInProgress: false,
  },
  {
    id: '11',
    namespace: mockNamespaces[2].name,
    name: 'cluster-11',
    ready: true,
    deleteInProgress: false,
  },
  {
    id: '12',
    namespace: mockNamespaces[2].name,
    name: 'cluster-12',
    ready: true,
    deleteInProgress: false,
  },
  {
    id: '13',
    namespace: mockNamespaces[2].name,
    name: 'cluster-13',
    ready: true,
    deleteInProgress: false,
  },
  {
    id: '14',
    namespace: mockNamespaces[2].name,
    name: 'cluster-14',
    ready: true,
    deleteInProgress: false,
  },
];

/**
 * [ASYNC]
 * Returns `mockClusters` after a short delay to simulate a request.
 * @returns {Promise<Array<Object>>} `mockClusters`.
 */
export const mockAsyncClusters = function () {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve({ clusters: mockClusters, namespaces: mockNamespaces });
    }, 500);
  });
};
