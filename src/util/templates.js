//
// Templates used to generate various configuration files
//

/**
 * Generates a kubeconfig context name for a cluster in the same way that MCC does
 *  when it generates cluster-specific kubeconfig files.
 * @returns {string} Context name.
 */
export const mkClusterContextName = function ({
  username,
  namespace,
  clusterName,
}) {
  return `${username}@${namespace}@${clusterName}`;
};

/**
 * Generates a KubeConfig for a specific cluster.
 * @param {Object} config Configuration parameters for the template.
 * @param {string} config.username Username for authentication.
 * @param {string} config.token OAuth token for user for this cluster.
 * @param {string} config.refreshToken OAuth refresh token for user for this cluster.
 * @param {Cluster} config.cluster Cluster for which to generate the config.
 * @returns {Object} JSON object representing the KubeConfig for accessing the cluster.
 */
export const kubeConfigTemplate = function ({
  username,
  token,
  refreshToken,
  cluster,
}) {
  return {
    apiVersion: 'v1',
    clusters: [
      {
        name: cluster.name,
        cluster: {
          'certificate-authority-data': cluster.apiCertificate,
          server: cluster.serverUrl,
        },
      },
    ],
    contexts: [
      {
        context: {
          cluster: cluster.name,
          user: username,
        },
        name: cluster.contextName,
      },
    ],
    'current-context': cluster.contextName,
    kind: 'Config',
    preferences: {},
    users: [
      {
        name: username,
        user: {
          'auth-provider': {
            config: {
              'client-id': cluster.idpClientId,
              'id-token': token,
              'idp-certificate-authority-data': cluster.idpCertificate,
              'idp-issuer-url': cluster.idpIssuerUrl,
              'refresh-token': refreshToken,
            },
            name: 'oidc',
          },
        },
      },
    ],
  };
};
