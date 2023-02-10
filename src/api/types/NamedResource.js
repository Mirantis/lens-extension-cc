import * as rtv from 'rtvjs';
import { merge } from 'lodash';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { Resource, resourceTs } from './Resource';
import { Namespace } from './Namespace';
import { logValue } from '../../util/logger';

/**
 * Typeset for an MCC namespaced API resource.
 */
export const namedResourceTs = mergeRtvShapes({}, resourceTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `NamedResource` class instance
  // nothing specific for now
});

/**
 * MCC resource that lives in a namespace as opposed to a cluster-wide resource
 *  like a Namespace.
 * @class NamedResource
 */
export class NamedResource extends Resource {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.data Raw data payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {Cloud} params.cloud Reference to the Cloud used to get the data.
   * @param {rtv.Typeset} params.typeset Typeset for verifying the data.
   */
  constructor({ data, namespace, cloud, typeset }) {
    super({ data, cloud, typeset });

    DEV_ENV &&
      rtv.verify(
        { namespace },
        {
          namespace: [rtv.CLASS_OBJECT, { ctor: Namespace }],
        }
      );

    /** @member {Namespace} namespace */
    Object.defineProperty(this, 'namespace', {
      enumerable: true,
      get() {
        return namespace;
      },
    });
  }

  /**
   * Converts this API Object into a Catalog Entity Model.
   * @returns {{ metadata: Object, spec: Object, status: Object }} Catalog Entity Model
   *  (use to create new Catalog Entity).
   */
  toModel() {
    const model = super.toModel();

    return merge({}, model, {
      metadata: {
        namespace: this.namespace.name,
      },
    });
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, namespace: ${logValue(
      this.namespace.name
    )}`;

    if (Object.getPrototypeOf(this).constructor === NamedResource) {
      return `{NamedResource ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }

  /**
   * @returns {string} A __short(er)__ (less verbose than `toString()`) string representation
   *  of this instance for logging/debugging.
   */
  toShortString() {
    return `{NamedResource ${this.namespace.name}/${this.name}/#${this.uid}/@${this.resourceVersion}/@@${this.cacheVersion}}`;
  }
}
