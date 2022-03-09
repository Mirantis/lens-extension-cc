import * as rtv from 'rtvjs';
import { merge } from 'lodash';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { ApiObject, apiObjectTs } from './ApiObject';
import { Namespace } from './Namespace';
import {
  LicenseEntity,
  licenseEntityPhases,
} from '../../catalog/LicenseEntity';
import { apiKinds } from '../apiConstants';
import { logString } from '../../util/logger';

/**
 * Typeset for an MCC License object.
 */
export const apiLicenseTs = mergeRtvShapes({}, apiObjectTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Credential` class instance

  kind: [rtv.STRING, { oneOf: apiKinds.RHEL_LICENSE }],
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
    super({ data, cloud, typeset: apiLicenseTs });

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
   * @override
   */
  toModel() {
    const model = super.toModel();

    return merge({}, model, {
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

  /**
   * Converts this API Object into a Catalog Entity that can be inserted into a Catalog Source.
   * @returns {LicenseEntity}
   */
  toEntity() {
    return new LicenseEntity(this.toModel());
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, namespace: ${logString(
      this.namespace.name
    )}`;

    if (Object.getPrototypeOf(this).constructor === License) {
      return `{License ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
