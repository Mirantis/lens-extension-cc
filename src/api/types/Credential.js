import * as rtv from 'rtvjs';
import { merge } from 'lodash';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { apiCredentialKinds, apiLabels } from '../apiConstants';
import { NamedResource, namedResourceTs } from './NamedResource';
import { entityLabels } from '../../catalog/catalogEntities';
import {
  CredentialEntity,
  credentialEntityPhases,
} from '../../catalog/CredentialEntity';

/**
 * Typeset for an MCC Credential API resource.
 */
export const credentialTs = mergeRtvShapes({}, namedResourceTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Credential` class instance

  kind: [rtv.STRING, { oneOf: Object.values(apiCredentialKinds) }],
  metadata: {
    labels: [
      rtv.OPTIONAL,
      {
        [apiLabels.KAAS_PROVIDER]: [rtv.OPTIONAL, rtv.STRING],
        [apiLabels.KAAS_REGION]: [rtv.OPTIONAL, rtv.STRING],
      },
    ],
  },
  // NOTE: BYOCredential resources don't have `status` objects for some reason
  status: [
    rtv.OPTIONAL,
    {
      valid: rtv.BOOLEAN,
    },
  ],
});

/**
 * MCC credential API resource.
 * @class Credential
 */
export class Credential extends NamedResource {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.data Raw data payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {Cloud} params.cloud Reference to the Cloud used to get the data.
   */
  constructor({ data, namespace, cloud }) {
    super({
      data,
      namespace,
      cloud,
      typeset: credentialTs,
    });

    /** @member {string} region */
    Object.defineProperty(this, 'region', {
      enumerable: true,
      get() {
        return data.metadata.labels?.[apiLabels.KAAS_REGION] || null;
      },
    });

    /** @member {string} provider */
    Object.defineProperty(this, 'provider', {
      enumerable: true,
      get() {
        return data.metadata.labels?.[apiLabels.KAAS_PROVIDER] || null;
      },
    });

    /** @member {boolean} valid */
    Object.defineProperty(this, 'valid', {
      enumerable: true,
      get() {
        // NOTE: BYOCredential objects do not have a `status` for some reason
        return !!data.status?.valid;
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
        labels: {
          [entityLabels.CLOUD]: this.cloud.name,
          [entityLabels.NAMESPACE]: this.namespace.name,
        },
      },
      spec: {
        provider: this.provider,
        region: this.region,
        valid: this.valid,
      },
      status: {
        phase: credentialEntityPhases.AVAILABLE,
      },
    });
  }

  /**
   * Converts this API Object into a Catalog Entity that can be inserted into a Catalog Source.
   * @returns {CredentialEntity}
   */
  toEntity() {
    return new CredentialEntity(this.toModel());
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, valid: ${this.valid}`;

    if (Object.getPrototypeOf(this).constructor === Credential) {
      return `{Credential ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
