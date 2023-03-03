import * as rtv from 'rtvjs';
import { merge } from 'lodash';
import * as semver from 'semver';
import { mergeRtvShapes } from '../../util/mergeRtvShapes';
import { Resource, resourceTs } from './Resource';
import { entityLabels } from '../../catalog/catalogEntities';
import { apiKinds } from '../apiConstants';
import { logValue } from '../../util/logger';

/**
 * Typeset for an MCC Release API resource.
 */
export const releaseTs = mergeRtvShapes({}, resourceTs, {
  // NOTE: this is not intended to be fully-representative; we only list the properties
  //  related to what we expect to find in order to create a `Release` class instance

  kind: [rtv.STRING, { oneOf: apiKinds.KAAS_RELEASE }],

  metadata: {
    labels: [rtv.OPTIONAL, rtv.HASH_MAP, { $values: rtv.JSON }],
  },

  spec: {
    version: rtv.STRING,
  },
});

/**
 * MCC license API resource.
 * @class Release
 */
export class Release extends Resource {
  /**
   * @constructor
   * @param {Object} params
   * @param {Object} params.kube Raw kube object payload from the API.
   * @param {Namespace} params.namespace Namespace to which the object belongs.
   * @param {DataCloud} params.dataCloud Reference to the DataCloud used to get the data.
   */
  constructor({ kube, namespace, dataCloud }) {
    super({ kube, namespace, dataCloud, typeset: releaseTs });

    // make sure it's 'x.y.z' format (should be, but just in case) since other semver APIs
    //  require it to be in order to either not throw, or behave properly
    const _version = semver.valid(semver.coerce(kube.spec.version));

    /**
     * @readonly
     * @member {boolean} active True if it's the active (current) release; false otherwise.
     */
    Object.defineProperty(this, 'active', {
      enumerable: true,
      get() {
        return kube.metadata.labels?.['kaas.mirantis.com/active'] === 'true';
      },
    });

    /**
     * @readonly
     * @member {string} version Semantic version.
     */
    Object.defineProperty(this, 'version', {
      enumerable: true,
      get() {
        return _version;
      },
    });
  }

  /**
   * Checks if the release's version satisfies a given semantic version range.
   * @param {string} range A valid range per https://www.npmjs.com/package/semver#ranges rules.
   *
   *  Note: A single version, e.g. '1.2.3', is also considered a valid range. Therefore, it's
   *   possible to check for a specific release like `satisfies('2.22')`.
   *
   * @returns {boolean} True if satisfied; false if not.
   */
  satisfies(range) {
    return semver.satisfies(this.version, range);
  }

  /**
   * Checks if the release's version is greater-than a given `x.y.z` version.
   * @param {string} version Must have all three components, `x.y.z`.
   * @returns {boolean} True if greater than this release; false otherwise.
   * @throws {TypeError} If `version` is not fully specified as `x.y.z`.
   */
  isGT(version) {
    if (semver.valid(version)) {
      return this.satisfies(`>${version}`);
    }

    throw new TypeError(`"${version}" is not in valid "x.y.z" format`);
  }

  /**
   * Checks if the release's version is greater-than-or-equal to a given `x.y.z` version.
   * @param {string} version Must have all three components, `x.y.z`.
   * @returns {boolean} True if greater than or equal to this release; false otherwise.
   * @throws {TypeError} If `version` is not fully specified as `x.y.z`.
   */
  isGTE(version) {
    if (semver.valid(version)) {
      return this.satisfies(`>=${version}`);
    }

    throw new TypeError(`"${version}" is not in valid "x.y.z" format`);
  }

  /**
   * Checks if the release's version is less-than a given `x.y.z` version.
   * @param {string} version Must have all three components, `x.y.z`.
   * @returns {boolean} True if less than this release; false otherwise.
   * @throws {TypeError} If `version` is not fully specified as `x.y.z`.
   */
  isLT(version) {
    if (semver.valid(version)) {
      return this.satisfies(`<${version}`);
    }

    throw new TypeError(`"${version}" is not in valid "x.y.z" format`);
  }

  /**
   * Checks if the release's version is less-than-or-equal to a given `x.y.z` version.
   * @param {string} version Must have all three components, `x.y.z`.
   * @returns {boolean} True if less than or equal to this release; false otherwise.
   * @throws {TypeError} If `version` is not fully specified as `x.y.z`.
   */
  isLTE(version) {
    if (semver.valid(version)) {
      return this.satisfies(`<=${version}`);
    }

    throw new TypeError(`"${version}" is not in valid "x.y.z" format`);
  }

  // NOTE: we don't have toEntity() because we don't show Releases in the Catalog at
  //  the moment (so we don't have a ReleaseEntity class for them either)

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
        },
      },
      spec: {
        active: this.active,
        version: this.version,
      },
      status: {
        phase: 'available',
      },
    });
  }

  /** @returns {string} A string representation of this instance for logging/debugging. */
  toString() {
    const propStr = `${super.toString()}, version: ${logValue(
      this.version
    )}, active: ${this.active}`;

    if (Object.getPrototypeOf(this).constructor === Release) {
      return `{Release ${propStr}}`;
    }

    // this is actually an extended class instance, so return only the properties
    return propStr;
  }
}
