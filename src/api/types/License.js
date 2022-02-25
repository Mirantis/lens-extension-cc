import * as rtv from 'rtvjs';
import { merge } from 'lodash';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { ApiObject, apiObjectTs } from './ApiObject';
import { Namespace } from './Namespace';
import { licenseEntityPhases } from '../../catalog/LicenseEntity';

/**
 * Typeset for an MCC License object.
 */
export const apiLicenseTs = mergeRtvShapes({}, apiObjectTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Credential` class instance

  kind: [rtv.STRING, { oneOf: 'RHELLicense' }],
});

/**
 * MCC license.
 * @class License
 * @param {Object} data Raw cluster data payload from the API.
 * @param {Namespace} namespace Namespace to which this object belongs.
 */
export class License extends ApiObject {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.data Raw data payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {Cloud} params.cloud Reference to the Cloud used to get the data.
   */
  constructor({ data, namespace, cloud }) {
    super({ data, cloud });

    DEV_ENV &&
      rtv.verify(
        { data, namespace },
        {
          data: apiLicenseTs,
          namespace: [rtv.CLASS_OBJECT, { ctor: Namespace }],
        }
      );

    /** @member {Namespace} */
    Object.defineProperty(this, 'namespace', {
      enumerable: true,
      get() {
        return namespace;
      },
    });

    /** @member {string} */
    Object.defineProperty(this, 'kind', {
      enumerable: true,
      get() {
        return data.kind;
      },
    });
  }

  /**
   * Converts this API Object into a Catalog Entity.
   * @returns {Object} Entity object.
   * @override
   */
  toEntity() {
    const entity = super.toEntity();

    return merge({}, entity, {
      metadata: {
        namespace: this.namespace.name,
        labels: {
          managementCluster: this.cloud.name,
          project: this.namespace.name,
        },
      },
      status: {
        phase: licenseEntityPhases.AVAILABLE,
      },
    });
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, kind: "${this.kind}", namespace: "${
      this.namespace.name
    }"`;

    if (Object.getPrototypeOf(this).constructor === License) {
      return `{License ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
