import rtv from 'rtvjs';

/**
 * MCC project/namespace.
 * @class Namespace
 */
export class Namespace {
  constructor(spec) {
    rtv.verify({ spec }, { spec: {
      uid: rtv.STRING,
      name: rtv.STRING,
      phase: rtv.STRING,
      deletionTimestamp: [rtv.OPTIONAL, rtv.STRING],
    }});

    /** @member {string} */
    this.id = spec.uid;

    /** @member {string} */
    this.name = spec.name;

    /** @member {string} */
    this.phase = spec.phase; // NOTE: 'Terminating' means 'being deleted'

    /** @member {boolean} */
    this.deleteInProgress = !!spec.deletionTimestamp;
  }
};
