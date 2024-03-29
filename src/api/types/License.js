import * as rtv from 'rtvjs';
import { merge } from 'lodash';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { NamedResource, namedResourceTs } from './NamedResource';
import { entityLabels } from '../../catalog/catalogEntities';
import {
  LicenseEntity,
  licenseEntityPhases,
} from '../../catalog/LicenseEntity';
import { apiKinds } from '../apiConstants';

/**
 * Typeset for an MCC License API resource.
 */
export const licenseTs = mergeRtvShapes({}, namedResourceTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `License` class instance

  kind: [rtv.STRING, { oneOf: apiKinds.RHEL_LICENSE }],
});

/**
 * MCC license API resource.
 * @class License
 */
export class License extends NamedResource {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.kube Raw kube object payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {DataCloud} params.dataCloud Reference to the DataCloud used to get the data.
   */
  constructor({ kube, namespace, dataCloud }) {
    super({ kube, namespace, dataCloud, typeset: licenseTs });
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
        labels: {
          [entityLabels.CLOUD]: this.dataCloud.name,
          [entityLabels.NAMESPACE]: this.namespace.name,
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
    const propStr = `${super.toString()}`;

    if (Object.getPrototypeOf(this).constructor === License) {
      return `{License ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
