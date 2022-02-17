import { mergeWith } from 'lodash'; // deep merge

/**
 * Performs a deep merge on an object with given sources per normal Lodash merge()
 *  rules __except__ that it does not deep-merge Arrays as those are expected to
 *  be Typesets. Those are overwritten on the `object` just like a normal string,
 *  boolean, or non-plain object property normally would be.
 * @param {Object} object
 * @param {Array<Object>} ...sources
 * @returns {Object} `object` with sources merged into it.
 */
export const mergeRtvShapes = function (object, ...sources) {
  return mergeWith(
    object,
    ...[
      ...sources,
      (objValue, srcValue) => {
        if (Array.isArray(objValue)) {
          // if it's an Array, it's a typeset instead of a shape, and so we __overwrite__
          //  the current value with the source just like a non-Object property would
          //  since merging typesets is likely not the intent; we're just using Lodash
          //  merge() to merge shapes (Objects), not Arrays (RTV.js Typesets)
          return srcValue;
        }
      },
    ]
  );
};
