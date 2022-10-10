//
// Templates used to generate various configuration files
//

import process from 'process';
import path from 'path';
import { logger } from './logger';
import { skipTlsVerify } from '../constants';

if (skipTlsVerify) {
  // SECURITY: get around issues with Clouds that have self-signed certificates (typically used
  //  for internal test Clouds of various kinds)
  logger.warn(
    'templates',
    'Generated cluster kubeConfig files will skip TLS verification: Be careful!'
  );
}

/**
 * @returns {string} The absolute path to the `kubelogin` binary for the current OS.
 */
const getKubeloginPath = function () {
  // NOTE: __dirname will be in relation to where this code is executed from by
  //  Lens, which is from /node_modules/@mirantis/lens-extension-cc/dist
  const binPath = '../bin';

  switch (process.platform) {
    case 'darwin': // macOS
      return path.resolve(
        __dirname,
        binPath,
        `kubelogin-macos-${process.arch === 'arm64' ? 'arm64' : 'amd64'}`
      );

    case 'win32': // Windows
      return path.resolve(__dirname, binPath, 'kubelogin-win-amd64.exe');

    // various Linux distributions (other than darwin) and also 'android' (which
    //  we'll just treat as Linux to keep the code simpler, since Lens doesn't
    //  support it anyway)
    default:
      return path.resolve(__dirname, binPath, 'kubelogin-linux-amd64');
  }
};

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
                command: getKubeloginPath(),
                args: [
                  'get-token',
                  `--oidc-issuer-url=${cluster.idpIssuerUrl}`,
                  `--oidc-client-id=${cluster.idpClientId}`,
                  `--certificate-authority-data=${cluster.idpCertificate}`,
                  ...(skipTlsVerify ? ['--insecure-skip-tls-verify'] : []),
                ],
              },
            },
          },
    ],
  };
};
