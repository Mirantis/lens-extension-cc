import { EventDispatcher } from '../EventDispatcher';

export const DATA_CLOUD_EVENTS = Object.freeze({
  /**
   * Initial data load (fetch) only, either starting or finished.
   *
   * Expected signature: `(event: { name: string, target: DataCloud }) => void`
   *
   * - `name`: event name
   */
  LOADED: 'loaded',

  /**
   * Whenever new data is being fetched, or done fetching (even on the initial
   *  data load, which means there's overlap with the `LOADED` event).
   *
   * Expected signature: `(event: { name: string, target: DataCloud }) => void`
   */
  FETCHING_CHANGE: 'fetchingChange',

  /**
   * When new data will be fetched.
   *
   * Expected signature: `(event: { name: string, target: DataCloud }) => void`
   */
  FETCH_DATA: 'fetchData',

  /**
   * Whenever the `error` property changes.
   *
   * Expected signature: `(event: { name: string, target: DataCloud }) => void`
   */
  ERROR_CHANGE: 'errorChange',

  /**
   * When any data-related property (e.g. `namespaces`) has been updated.
   *
   * Expected signature: `(event: { name: string, target: DataCloud }) => void`
   */
  DATA_UPDATED: 'dataUpdated',

  // TODO[PRODX-22469]: Remove if we drop watches.
  /**
   * When one or more API Resources fetched by this DataCloud has been updated
   *  (added, modified, or deleted).
   *
   * Expected signature: `(event: { name: string, target: DataCloud }, info: { updates: Array<{ type: "ADDED"|"MODIFIED"|"DELETED", resource: Resource }> }) => void`
   *
   * - `info.updates`: List of changes to resources that have taken place.
   */
  RESOURCE_UPDATED: 'resourceUpdated',
});

export class DataCloud extends EventDispatcher {
  constructor() {
    super();

    this.dispatchEvent(DATA_CLOUD_EVENTS.LOADED);
  }
}
