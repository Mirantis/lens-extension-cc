import { Renderer } from '@k8slens/extensions';
import { noteOwner } from '../../strings';

const {
  Component: { Notifications },
} = Renderer;

/**
 * Defines common functionality for use when implementing a React context provider
 *  that provides async state updates.
 */
export class ProviderStore {
  constructor() {
    /**
     * @property {function} setState Function to call to trigger updates to the provider.
     *
     *  NOTE: Per https://reactjs.org/docs/hooks-reference.html#usestate,
     *   "React guarantees that setState function identity is stable and won’t change
     *   on re-renders." For this reason, it's safe to set once when the `setState`
     *   function is first generated, but there's no harm in setting it on every
     *   provider render.
     */
    this.setState = null; // set this directly whenever the context is updated

    this.store = this.makeNew(); // initialize
  }

  // convenience accessor for basic store property
  /** @property {boolean} loading If the loading state is true. */
  get loading() {
    return this.store.loading;
  }

  set loading(newValue) {
    this.store.loading = !!newValue;
  }

  // convenience accessor for basic store property
  /** @property {boolean} loaded If the loaded state is true. */
  get loaded() {
    return this.store.loaded;
  }

  set loaded(newValue) {
    this.store.loaded = !!newValue;
  }

  // convenience accessor for basic store property
  /**
   * @property {string|undefined} error The error encountered, if any.
   *  Empty string is considered NOT an error.
   */
  get error() {
    return this.store.error;
  }

  set error(newValue) {
    this.store.error = newValue || undefined; // empty string is NOT an error
  }

  /**
   * Generates a new, empty store object set to its initial state.
   * @returns {Object}
   */
  makeNew() {
    return {
      loading: false, // {boolean} true if currently loading data
      loaded: false, // {boolean} true if load is complete (regardless of error)
      error: undefined, // {string} if an error occurred; undefined otherwise
    };
  }

  /**
   * Creates a SHALLOW clone of `this.store`. Override if a deep clone is necessary.
   * @returns {Object} Cloned store object.
   */
  clone() {
    // NOTE: by deep-cloning the store, React will detect changes to the root object,
    //  as well as to any nested objects, triggering a render regardless of whether a
    //  component is depending on the root, or on one of its children
    return { ...this.store }; // assume only primitive props so no need to deep-clone.
  }

  /**
   * Resets store state. Data will need to be reloaded.
   * @param {boolean} [loading] True if resetting because data is loading; false if
   *  just resetting to initial state.
   */
  reset(loading = false) {
    Object.assign(this.store, this.makeNew()); // replace all properties with totally new ones
    this.store.loading = loading;
    this.onChange();
  }

  /**
   * Forces an update to the provider's state.
   */
  triggerContextUpdate() {
    if (typeof this.setState !== 'function') {
      throw new Error(
        '[ProviderStore.triggerContextUpdate()] setState() is not configured: Unable to trigger a context update'
      );
    }

    this.setState(this.clone());
  }

  /**
   * Checks the store's `error` property and if it's not empty/falsy, posts
   *  an error notification to the UI with its content.
   */
  notifyIfError() {
    if (this.store.error) {
      Notifications.error(`${this.store.error} ${noteOwner}`);
    }
  }

  /**
   * Called when a store property has changed to validate the current store data.
   *  Base implementation does nothing. Override should throw an error on failure.
   */
  validate() {}

  /**
   * Called when a store property has changed.
   */
  onChange() {
    this.validate();
    this.triggerContextUpdate();
  }
}
