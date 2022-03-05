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
 *
 * If a `token` is not given, the generated kubeconfig will require the
 *  https://github.com/int128/kubelogin Kubernetes plugin to be installed on the local
 *  system in order for Lens to open the cluster.
 *
 * Rather than needing a cluster-specific token (which would require going to the browser
 *  to get the user to sign in to MCC again for each cluster added), the generating of the
 *  token is offset to the moment when Lens tries to open the cluster from the Catalog.
 *  Then `oidc-login` (which is this `kubelogin` plugin) will be automatically invoked,
 *  opening the user's default browser so they can sign in to MCC and generate a token
 *  for the cluster.
 *
 * @param {Object} config Configuration parameters for the template.
 * @param {Cluster} config.cluster Cluster for which to generate the config.
 * @param {string} config.username Username for authentication.
 * @param {string} [config.token] Optional OAuth token for user for this cluster.
 * @param {string} [config.refreshToken] Optional OAuth refresh token for user for this cluster.
 *  Ignored if `token` is not specified.
 * @returns {Object} JSON object representing the KubeConfig for accessing the cluster.
 */
export const mkKubeConfig = function ({
  cluster,
  username,
  token,
  refreshToken,
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
      token
        ? {
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
          }
        : {
            name: username,
            user: {
              // See https://github.com/int128/kubelogin#setup for this config
              exec: {
                apiVersion: 'client.authentication.k8s.io/v1beta1',
                command: 'kubectl',
                args: [
                  'oidc-login',
                  'get-token',
                  `--oidc-issuer-url=${cluster.idpIssuerUrl}`,
                  `--oidc-client-id=${cluster.idpClientId}`,
                  `--certificate-authority-data=${cluster.idpCertificate}`,
                ],
              },
            },
          },
    ],
  };
};
