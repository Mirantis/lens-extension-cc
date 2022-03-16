import * as rtv from 'rtvjs';
import { get, merge, pick } from 'lodash';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { apiCredentialKinds } from '../apiConstants';
import { Resource, resourceTs } from './Resource';
import { Namespace } from './Namespace';
import {
  CredentialEntity,
  credentialEntityPhases,
} from '../../catalog/CredentialEntity';

/**
 * Typeset for an MCC Credential API resource.
 */
export const credentialTs = mergeRtvShapes({}, resourceTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Credential` class instance

  kind: [rtv.STRING, { oneOf: Object.values(apiCredentialKinds) }],
  metadata: {
    labels: [
      rtv.OPTIONAL,
      {
        'kaas.mirantis.com/provider': [rtv.OPTIONAL, rtv.STRING],
        'kaas.mirantis.com/region': [rtv.OPTIONAL, rtv.STRING],
      },
    ],
  },
  // NOTE: BYOCredential resources don't have `status` objects for some reason
  //  so it's effectively made optional by temporarily removing it from the Typeset
  //  in the Credential class constructor only when the kind is BYO_CREDENTIAL
  status: {
    valid: rtv.BOOLEAN,
  },
});

/**
 * MCC credential API resource.
 * @class Proxy
 */
export class Credential extends Resource {
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
      cloud,
      // NOTE: BYOCredential objects do not have a `status` for some reason
      typeset:
        data.kind === apiCredentialKinds.BYO_CREDENTIAL
          ? pick(credentialTs, ['metadata', 'spec'])
          : credentialTs,
    });

    // now we have check only for openStack. It's hard to predict other types
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

    /** @member {string} region */
    Object.defineProperty(this, 'region', {
      enumerable: true,
      get() {
        return get(data.metadata, 'labels["kaas.mirantis.com/region"]', null);
      },
    });

    /** @member {string} provider */
    Object.defineProperty(this, 'provider', {
      enumerable: true,
      get() {
        return get(data.metadata, 'labels["kaas.mirantis.com/provider"]', null);
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
        namespace: this.namespace.name,
        labels: {
          managementCluster: this.cloud.name,
          project: this.namespace.name,
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
    const propStr = `${super.toString()}, namespace: "${
      this.namespace.name
    }", valid: ${this.valid}`;

    if (Object.getPrototypeOf(this).constructor === Credential) {
      return `{Credential ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
