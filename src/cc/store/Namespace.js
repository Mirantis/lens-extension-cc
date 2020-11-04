import rtv from 'rtvjs';

/**
 * MCC project/namespace.
 * @class Namespace
 * @param {Object} data Raw namespace data payload from the API.
 */
export class Namespace {
  constructor(data) {
    rtv.verify(
      { data },
      {
        data: {
          metadata: {
            uid: rtv.STRING,
            name: rtv.STRING,
            creationTimestamp: rtv.STRING, // ISO8601 timestamp
            deletionTimestamp: [rtv.OPTIONAL, rtv.STRING], // ISO8601 timestamp; only exists if being deleted
          },
          status: {
            phase: rtv.STRING,
          },
        },
      }
    );

    /** @member {string} */
    this.id = data.metadata.uid;

    /** @member {string} */
    this.name = data.metadata.name;

    /** @member {boolean} */
    this.deleteInProgress = !!data.metadata.deletionTimestamp; // 'Active', 'Terminating', others?

    /** @member {string} */ this.phase = data.status.phase;
  }
}
