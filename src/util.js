//
// Basic utilities
//

import pkg from '../package.json';

/**
 * Logs a message to the JS Console. Has a method for each JS Console method,
 *  but each method requires one additional parameter, `scope`, before the
 *  rest of the normal parameters for the method.
 * @param {string} scope Name or path of the module emitting the message, eg.
 *  'SsoAuthProvider' or 'store/Cluster' or 'store/ClusterDataProvider._fetchNamespaces()'.
 *  Something helpful.
 * @param {string} message Log message.
 * @param {...*} [rest] Remaining parameters are passed to the `console` method
 *  after the message.
 */
export const logger = (function () {
  const handler = function (level) {
    return function (scope, message, ...rest) {
      if (!scope || !message) {
        throw new Error('scope and message are required');
      }

      const msg = `[${pkg.name}/${scope.replace(/^\//, '')}] ${
        level === 'error' ? 'ERROR: ' : ''
      }${message}`;

      // eslint-disable-next-line no-console -- we intend to log
      console[level](msg, ...rest);
    };
  };

  return Object.keys(console).reduce((def, method) => {
    def[method] = handler(method);
    return def;
  }, {});
})();
