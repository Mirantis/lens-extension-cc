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
const testSuccessBodyMessage = 'success';

jest.mock('../../common/Cloud');
jest.mock('../clients/ApiClient', () => {
  const original = jest.requireActual('../clients/ApiClient');

  const ApiClient = class {
    refreshToken(refreshToken) {
      return Promise.resolve({
        response: {
          status: refreshToken === REFRESH_TOKENS.VALID ? 200 : 400,
        },
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
jest.mock('../clients/ResourceClient', () => {
  const original = jest.requireActual('../clients/ResourceClient');

  const ResourceClient = class {
    list(resourceType) {
      return Promise.resolve({
        response: {
          status: resourceType === 'vspherecredentials' ? 401 : 200,
        },
        error: resourceType === 'byocredentials' ? testErrorMessage : '',
        body:
          resourceType === 'vspherecredentials' ? '' : testSuccessBodyMessage,
        url: '',
      });
    }
  };

  return {
    ...original,
    ResourceClient,
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

    mockConsole(['log', 'info', 'warn', 'error']); // automatically restored after each test
  });

  describe('extractJwtPayload()', () => {
    const testToken =
      'eyJhbGciOiJIUzI1NiJ9.eyJmb28iOjEyM30.YWt1gu2vJ5piNjOHklcDHtCBbHwk_VbbhuLxejsapLs';

    it('returns an empty object if no token provided', () => {
      expect(apiUtil.extractJwtPayload()).toEqual({});
    });

    it('returns a JSON object if token provided', () => {
      expect(apiUtil.extractJwtPayload(testToken)).toMatchObject({
        foo: 123,
      });
    });
  });

  describe('cloudRefresh()', () => {
    let isTokensRefreshed;

    beforeEach(() => {
      isTokensRefreshed = false;
    });

    describe('errors', () => {
      const logSpy = jest.spyOn(console, 'error');

      it('triggers an error', async () => {
        isTokensRefreshed = await apiUtil.cloudRefresh(
          fakeCloudWithInvalidRefreshToken
        );
        expect(isTokensRefreshed).toBe(false);
        expect(logSpy.mock.calls[0][0]).toMatch(
          /(Unable to refresh expired token)/i
        );
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
    let fakeCloud;

    beforeEach(() => {
      fakeCloudWithoutToken = new Cloud({
        cloudUrl: cloudUrl,
      });

      fakeCloud = new Cloud({
        cloudUrl: cloudUrl,
        __mockStatus: 'connected',
      });
    });

    describe('errors', () => {
      it('triggers an error when token is missing', async () => {
        const result = await apiUtil.cloudRequest({
          cloud: fakeCloudWithoutToken,
          method: 'list',
          resourceType: apiResourceTypes.AWS_CREDENTIAL,
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

      it('triggers an error when token is expired', async () => {
        const result = await apiUtil.cloudRequest({
          cloud: fakeCloud,
          method: 'list',
          resourceType: apiResourceTypes.VSPHERE_CREDENTIAL,
        });

        expect(result.status).toBe(401);
      });
    });

    describe('successes', () => {
      it('makes an authenticated request using the given Cloud, error is |empty|', async () => {
        const result = await apiUtil.cloudRequest({
          cloud: fakeCloud,
          method: 'list',
          resourceType: apiResourceTypes.AWS_CREDENTIAL,
        });

        expect(result.body).toBe(testSuccessBodyMessage);
        expect(result.error).toBe('');
      });

      it('makes an authenticated request using the given Cloud, error is |not empty|', async () => {
        const result = await apiUtil.cloudRequest({
          cloud: fakeCloud,
          method: 'list',
          resourceType: apiResourceTypes.BYO_CREDENTIAL,
        });

        expect(result.body).toBe(testSuccessBodyMessage);
        expect(result.error).toBe(testErrorMessage);
      });
    });
  });
});
