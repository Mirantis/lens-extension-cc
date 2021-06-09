/**
 * Freezes all objects deep into all enumerable keys (and within any arrays),
 *  including `obj` itself. An _object_ is anything that is `typeof` "object",
 *  except for arrays. Therefore, a `RegExp`, for example, would get frozen,
 *  but a `function` would not.
 *
 * This function is meant to be used with plain objects and arrays.
 *
 * NOTE: `obj` is frozen in-place. A copy is not created.
 *
 * @param {Object} obj The object to freeze, and whose enumerable object keys will
 *  be recursively frozen.
 * @returns {Object} The now-frozen `obj`. If `obj` is not an array or object,
 *  it is simply returned verbatim.
 */
export const deepFreeze = function (obj) {
  // only objects (possibly nested in arrays) need freezing
  // NOTE: typeof [] === 'object' so we cover the array case here too
  if (obj && typeof obj === 'object') {
    let values;

    if (Array.isArray(obj)) {
      values = obj; // don't freeze arrays
    } else {
      Object.freeze(obj); // shallow freeze
      values = Object.values(obj);
    }

    values.forEach((v) => deepFreeze(v)); // recursive
  }

  return obj;
};
