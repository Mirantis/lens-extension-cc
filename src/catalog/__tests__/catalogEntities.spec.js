import mockConsole from 'jest-mock-console';
import { apiKinds, apiCredentialKinds } from '../../api/apiConstants';
import * as catalogEntities from '../catalogEntities';

describe('/renderer/catalogEntities', () => {
  beforeEach(() => {
    mockConsole(); // automatically restored after each test
  });

  describe('generateEntityUrl()', () => {
    [
      apiKinds.RHEL_LICENSE,
      apiKinds.PROXY,
      apiKinds.PUBLIC_KEY,
      apiKinds.CLUSTER,
      ...Object.values(apiCredentialKinds),
    ].forEach((apiKind) => {
      const entity = {
        metadata: {
          cloudUrl: 'https://test-cloud-url.com',
          kind: apiKind,
          name: 'test-entity-name',
          namespace: 'test-namespace',
        },
      };

      it(`returns url for |${apiKind}| entity`, () => {
        const url = `${entity.metadata.cloudUrl}/projects/${entity.metadata.namespace}`;

        switch (entity.metadata.kind) {
          case apiKinds.RHEL_LICENSE:
            expect(catalogEntities.generateEntityUrl(entity)).toBe(
              `${url}/rhel?name=${entity.metadata.name}&details`
            );
            break;
          case apiKinds.PROXY:
            expect(catalogEntities.generateEntityUrl(entity)).toBe(
              `${url}/proxies?name=${entity.metadata.name}&details`
            );
            break;
          case apiKinds.PUBLIC_KEY:
            expect(catalogEntities.generateEntityUrl(entity)).toBe(
              `${url}/keypairs?name=${entity.metadata.name}&details`
            );
            break;
          case apiKinds.CLUSTER:
            expect(catalogEntities.generateEntityUrl(entity)).toBe(
              `${url}/clusters/${entity.metadata.name}`
            );
            break;
          default:
            if (Object.values(apiCredentialKinds).includes(apiKind)) {
              expect(catalogEntities.generateEntityUrl(entity)).toBe(
                `${url}/creds?name=${entity.metadata.name}&details`
              );
            } else {
              throw new Error(
                `Unexpected apiKind="${apiKind}": Test case may need to be enhanced to support it`
              );
            }
        }
      });
    });

    it('returns url for unknown/unsupported entity', () => {
      const entity = {
        metadata: {
          cloudUrl: 'https://test-cloud-url.com',
          kind: 'unknown',
          name: 'test-entity-name',
          namespace: 'test-namespace',
        },
      };
      const url = `${entity.metadata.cloudUrl}/projects/${entity.metadata.namespace}`;

      expect(catalogEntities.generateEntityUrl(entity)).toBe(url);
    });
  });

  describe('findEntity()', () => {
    it('finds a Catalog Entity in a list of entities', () => {
      /**
       * Generate model with custom uid.
       * @param {string} uid
       */
      const createTestModel = (uid) => {
        return {
          metadata: {
            cloudUrl: 'https://test-cloud-url.com',
            kind: apiKinds.CLUSTER,
            uid: uid,
            name: 'name',
            namespace: 'namespace',
            description: 'description',
            source: 'mirantis-container-cloud',
            resourceVersion: 'resourceVersion',
            syncedAt: '2021-12-03T20:38:04Z',
          },
          spec: {
            createdAt: '2021-12-03T20:38:04Z',
            publicKey: 'publicKey',
          },
          status: {
            phase: 'phase',
          },
          kind: 'MccSshKey',
        };
      };

      const firstModel = createTestModel('uid-1');
      const secondModel = createTestModel('uid-2');
      const thirdModel = createTestModel('uid-3');

      const listOfEntities = [firstModel, secondModel, thirdModel];

      const testModel = secondModel;

      expect(catalogEntities.findEntity(listOfEntities, testModel)).toBe(
        testModel
      );
    });
  });
});
