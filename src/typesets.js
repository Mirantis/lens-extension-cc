//
// RTV Typesets for runtime validations
//

import * as rtv from 'rtvjs';

/**
 * Describes an object used to create a new instance of a `Common.Catalog.KubernetesCluster`
 *  object that gets added to the Lens Catalog.
 */
export const clusterModelTs = {
  metadata: {
    //
    // NATIVE PROPERTIES
    //

    uid: rtv.STRING,
    name: rtv.STRING,
    source: [rtv.OPTIONAL, rtv.STRING],
    labels: [
      rtv.OPTIONAL,
      rtv.HASH_MAP,
      {
        $values: rtv.STRING,
      },
    ],

    //
    // CUSTOM PROPERTIES
    //

    namespace: rtv.STRING,
    cloudUrl: rtv.STRING, // URL of the MCC instance to which this cluster belongs
  },
  spec: {
    kubeconfigPath: rtv.STRING, // absolute path
    kubeconfigContext: rtv.STRING,
  },
  status: {
    phase: [rtv.STRING, { oneOf: ['connected', 'disconnected'] }],
  },
};
