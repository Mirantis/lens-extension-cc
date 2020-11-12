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

  /** @property {boolean} If the loading state is true. */
  get loading() {
    return this.store.loading;
  }

  /** @property {boolean} If the loaded state is true. */
  get loaded() {
    return this.store.loaded;
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
    this.setState(this.clone());
  }

  /**
   * Called when a store property has changed.
   */
  onChange() {
    this.triggerContextUpdate();
  }
}
