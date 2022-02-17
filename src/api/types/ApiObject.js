export class ApiObject {
  constructor(data) {
    /** @member {string} */
    this.id = data.metadata.uid;

    /** @member {string} */
    this.name = data.metadata.name;

    /** @member {Date} */
    this.creationDate = new Date(data.metadata.creationTimestamp);

    /** @member {boolean|null} */
    this.deleteInProgress = !!data.metadata.deletionTimestamp;
  }
}
