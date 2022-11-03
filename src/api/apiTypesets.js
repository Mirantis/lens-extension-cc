//
// RTV typesets for common API resource structures
//

import * as rtv from 'rtvjs';

/**
 * Typeset for a single readiness condition in a Machine or Cluster resource.
 */
export const nodeConditionTs = {
  message: rtv.STRING, // ready message if `ready=true` or error message if `ready=false`
  ready: rtv.BOOLEAN, // true if component is ready (NOTE: false if maintenance mode is active)
  type: rtv.STRING, // component name, e.g. 'Kubelet', 'Swarm, 'Maintenance', etc.
};
