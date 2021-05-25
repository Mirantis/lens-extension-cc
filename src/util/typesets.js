//
// RTV Typesets for runtime validations
//
// NOTE: Each one is gated by DEV_ENV so that rtv.js doesn't end-up in the Prod bundle.
//

import * as rtv from 'rtvjs';

export const clusterModelTs = DEV_ENV
  ? {
      metadata: {
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
      },
      spec: {
        kubeconfigPath: rtv.STRING,
        kubeconfigContext: rtv.STRING,
      },
      status: {
        phase: [rtv.STRING, { oneOf: ['connected', 'disconnected'] }],
      },
    }
  : {};
