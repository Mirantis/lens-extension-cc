import mockConsole from 'jest-mock-console';
import { Cloud } from '../../common/Cloud'; // MOCKED
import { apiResourceTypes } from '../apiConstants';
import * as apiUtil from '../apiUtil';
import * as strings from '../../strings';

const REFRESH_TOKENS = {
  VALID: 'valid-token',
  INVALID: 'invalid-token',
};

const testErrorMessage = 'error-message';

jest.mock('../../common/Cloud');
jest.mock('../clients/ApiClient', () => {
  const original = jest.requireActual('../clients/ApiClient');

  const ApiClient = class {
    refreshToken(refreshToken) {
      return Promise.resolve({
        responce: {},
        body: '',
        error: refreshToken === REFRESH_TOKENS.VALID ? '' : testErrorMessage,
      });
    }

    logout(refreshToken) {
      return Promise.resolve({
        error: refreshToken === REFRESH_TOKENS.VALID ? '' : testErrorMessage,
      });
    }
  };

  return {
    ...original,
    ApiClient,
  };
});

describe('/api/apiUtil', () => {
  let fakeCloudWithInvalidRefreshToken;
  let fakeCloudWithValidRefreshToken;
  let cloudUrl = 'http://foo.com';

  beforeEach(() => {
    fakeCloudWithInvalidRefreshToken = new Cloud({
      cloudUrl: cloudUrl,
      refreshToken: REFRESH_TOKENS.INVALID,
    });

    fakeCloudWithValidRefreshToken = new Cloud({
      cloudUrl: cloudUrl,
      refreshToken: REFRESH_TOKENS.VALID,
    });

    // mockConsole(['log', 'info', 'warn', 'error']); // automatically restored after each test
  });

  describe('extractJwtPayload()', () => {
    const testToken =
      'eyJhbGciOiJIUzI1NiJ9.eyJmb28iOjEyM30.YWt1gu2vJ5piNjOHklcDHtCBbHwk_VbbhuLxejsapLs';

    it('returns an empty object if no token provided', () => {
      expect(apiUtil.extractJwtPayload()).toEqual({});
    });

    it('returns a JSON object if token provided', () => {
      expect(apiUtil.extractJwtPayload(testToken)).toMatchObject({
        'foo': 123
      })
    });
  });

  describe('cloudRefresh()', () => {
    let isTokensRefreshed;

    beforeEach(() => {
      isTokensRefreshed = false;
    });

    describe('errors', () => {
      it('triggers an error', async () => {
        isTokensRefreshed = await apiUtil.cloudRefresh(
          fakeCloudWithInvalidRefreshToken
        );
        expect(isTokensRefreshed).toBe(false);
      });
    });

    describe('successes', () => {
      it('refreshes a Cloud`s auth tokens', async () => {
        isTokensRefreshed = await apiUtil.cloudRefresh(
          fakeCloudWithValidRefreshToken
        );
        expect(isTokensRefreshed).toBe(true);
      });
    });
  });

  describe('cloudLogout()', () => {
    // `null` if successful; error message otherwise
    let cloudLogoutResponse;

    beforeEach(() => {
      cloudLogoutResponse = null;
    });

    describe('errors', () => {
      it('triggers an error', async () => {
        cloudLogoutResponse = await apiUtil.cloudLogout(
          fakeCloudWithInvalidRefreshToken
        );
        expect(cloudLogoutResponse).toBe(testErrorMessage);
      });
    });

    describe('successes', () => {
      it('terminates a Cloud session', async () => {
        cloudLogoutResponse = await apiUtil.cloudLogout(
          fakeCloudWithValidRefreshToken
        );
        expect(cloudLogoutResponse).toBe(null);
      });
    });
  });

  describe('cloudRequest()', () => {
    let fakeCloudWithoutToken;
    let fakeCloudWithToken;
    let fakeCloud;

    beforeEach(() => {
      fakeCloudWithoutToken = new Cloud({
        cloudUrl: cloudUrl,
      });

      fakeCloud = new Cloud({
        cloudUrl: cloudUrl,
        __mockStatus: 'connected',
      });

      fakeCloudWithToken = new Cloud({
        cloudUrl: cloudUrl,
        // token: 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjEsImlhdCI6MSwiYXV0aF90aW1lIjoxLCJqdGkiOiIxIiwiaXNzIjoiaHR0cHM6Ly90ZXN0LmNvbSIsImF1ZCI6InRlc3QiLCJzdWIiOiIxIiwidHlwIjoiSUQiLCJhenAiOiJ0ZXN0Iiwic2Vzc2lvbl9zdGF0ZSI6IjEiLCJhdF9oYXNoIjoiMSIsInNpZCI6IjEiLCJpYW1fcm9sZXMiOlsidDp0ZXN0OnRlc3RAdGVzdCJdLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsIm5hbWUiOiJOYW1lIFN1cm5hbWUiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJ0ZXN0QHRlc3QuY29tIiwiZ2l2ZW5fbmFtZSI6Ik5hbWUiLCJmYW1pbHlfbmFtZSI6IlN1cm5hbWUiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20ifQ.4frPaY8SIQnnew63eolalhYgoZEFI4jYwAGJs0tGwHI',
        namespaces: [
          {
            cloudUrl: 'http://foo.com',
            clusterCount: 4,
            credentialCount: 4,
            licenseCount: 1,
            machineCount: 12,
            name: 'default',
            proxyCount: 0,
            sshKeyCount: 2,
            synced: true,
          },
        ],
        __mockStatus: 'connected',
      });
    });

    describe('errors', () => {
      it('triggers an error when token is missing', async () => {
        const result = await apiUtil.cloudRequest({
          cloud: fakeCloudWithoutToken,
          method: 'list',
          resourceType: apiResourceTypes.NAMESPACE,
        });

        expect(result.error).toBe(strings.apiUtil.error.noTokens());
      });

      it('triggers an error when invalid resource type', async () => {
        const invalidResourceType = 'invalid';

        const result = await apiUtil.cloudRequest({
          cloud: fakeCloud,
          method: 'list',
          resourceType: invalidResourceType,
        });

        expect(result.error).toBe(
          strings.apiUtil.error.invalidResourceType(invalidResourceType)
        );
      });
    });

    describe('successes', () => {
      it('makes an authenticated request using the given Cloud', async () => {
        const result = await apiUtil.cloudRequest({
          cloud: fakeCloudWithToken,
          method: 'list',
          resourceType: apiResourceTypes.NAMESPACE,
        });

        console.log(result);

        // expect(Object.keys(result)).toHaveLength(7);
      });
    });
  });
});
