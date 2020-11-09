//
// General utilities
//

/**
 * [ASYNC] Waits for every promise to either resolve or reject, which is different
 *  from `Promise.all()` which rejects on the first rejection __without waiting
 *  for other promises to settle__.
 * @param {Array<Promise>} promises
 * @returns {Promise<{ results: Array, errors: Array}>} An object where `results`
 *  are the settled values of all resolved promises, in the order in which they
 *  appeared in `promises` (but not necessarily sequential if there were rejections),
 *  and `errors` are the settled values of all rejected promises, in the order
 *  in which they appeared in `promises` (again, not necessarily sequential).
 *  Either array will be empty if there were no resolutions/rejections, respectively.
 *
 *  NOTE: This Promise does NOT reject. It always resolves. Errors, if any, are
 *   provided in the resolved object.
 */
export const every = function (promises) {
  // DEBUG no longer needed? save this somewhere for the future...
  return new Promise(function (resolve) {
    const output = { results: [], errors: [] };

    // resolve immediately if we have nothing to monitor
    if (promises.length <= 0) {
      return resolve(output);
    }

    // keys are promises, values are null until either fulfilled or rejected;
    //  when fulfilled, `{ result: any}`, when rejected, `{ error: any }`.
    // NOTE: keys in a Map are ordered in the order of insertion
    const map = new Map(promises.map((promise) => [promise, null]));

    let remainder = promises.length;
    const finish = function () {
      remainder--;

      if (remainder <= 0) {
        for (const res of map.values()) {
          // NOTE: property value will be `undefined` if the promise didn't
          //  resolve to anything, or reject with anything
          if (Object.prototype.hasOwnProperty.call(res, 'result')) {
            output.results.push(res.result);
          } else {
            output.errors.push(res.error);
          }
        }

        resolve(output);
      }
    };

    promises.forEach((promise) => {
      promise
        .then((result) => map.set(promise, { result }))
        .catch((error) => map.set(promise, { error }))
        .finally(finish);
    });
  });
};
