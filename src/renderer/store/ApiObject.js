export class ApiObject {
  constructor(data) {
    /** @member {string} */
    this.id = data.metadata.uid;

    /** @member {string} */
    this.name = data.metadata.name;

    /** @member {boolean} */
    this.deleteInProgress = !!data.metadata.deletionTimestamp;

    /** @member {string} */
    this.phase = data.status.phase; // NEED to be confirmed. Eg Credential doesn't have this 'phase', it has 'valid' bool instead
  }
}
