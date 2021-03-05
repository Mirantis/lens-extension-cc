"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Namespace = void 0;

var rtv = _interopRequireWildcard(require("rtvjs"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * MCC project/namespace.
 * @class Namespace
 * @param {Object} data Raw namespace data payload from the API.
 */
class Namespace {
  constructor(data) {
    DEV_ENV && rtv.verify({
      data
    }, {
      data: {
        metadata: {
          uid: rtv.STRING,
          name: rtv.STRING,
          creationTimestamp: rtv.STRING,
          // ISO8601 timestamp
          deletionTimestamp: [rtv.OPTIONAL, rtv.STRING] // ISO8601 timestamp; only exists if being deleted

        },
        status: {
          phase: rtv.STRING
        }
      }
    });
    /** @member {string} */

    this.id = data.metadata.uid;
    /** @member {string} */

    this.name = data.metadata.name;
    /** @member {boolean} */

    this.deleteInProgress = !!data.metadata.deletionTimestamp; // 'Active', 'Terminating', others?

    /** @member {string} */

    this.phase = data.status.phase;
  }

}

exports.Namespace = Namespace;