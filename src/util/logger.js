//
// Basic utilities
//

import pkg from '../../package.json';

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
        level === 'error' ? 'ERROR: ' : level === 'warn' ? 'Warning: ' : ''
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

/**
 * Formats a value for logging.
 * @param {any} [value] A value which may not be defined.
 * @returns {string} Always returns a string. If it's an actual string, empty or
 *  not, the value is returned in double quotes, `"foo"`. If it's null/undefined,
 *  it's returned as-is and string-cast, which will be the string "null" or
 *  "undefined". If it's an array, it's returned as `"[...]"`. Otherwise, it's just
 *  cast to a string.
 */
export const logValue = function (value) {
  if (typeof value === 'string') {
    return `"${value}"`;
  }

  if (Array.isArray(value)) {
    return `[${value.map(logValue).join(', ')}]`; // recursive
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return `${value.name}|"${value.message}"`;
  }

  return `${value}`; // cast to string and we get what we get
};
