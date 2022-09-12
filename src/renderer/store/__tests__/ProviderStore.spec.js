import mockConsole from 'jest-mock-console';
import { ProviderStore } from '../ProviderStore';
import { noteOwner } from '../../../strings';

describe('/renderer/store/ProviderStore', () => {
  let pr;
  let defaultStoreObj;

  beforeEach(() => {
    mockConsole(['log', 'info', 'warn']); // automatically restored after each test

    pr = new ProviderStore();
    defaultStoreObj = {
      loading: false,
      loaded: false,
      error: undefined,
    };
  });

  it('set/get loading', () => {
    pr.loading = true;
    expect(pr.loading).toEqual(true);
  });

  it('set/get loaded', () => {
    pr.loaded = true;
    expect(pr.loaded).toEqual(true);
  });

  ['', 'test error message'].forEach((error) => {
    it(`set/get error, error=|'${error}'|`, () => {
      pr.error = error;
      if (error !== '') {
        expect(pr.store.error).toEqual(error);
      } else {
        expect(pr.store.error).toBeUndefined();
      }
    });
  });

  it('generates a new, empty store object', () => {
    expect(pr.makeNew()).toMatchObject(defaultStoreObj);
  });

  it('triggers an error on update the provider`s state', () => {
    expect(() => pr.triggerContextUpdate()).toThrowError(
      /setState\(\) is not configured/
    );
  });

  it('posts an error notification to the UI with its content', () => {
    expect(document.querySelector('.message')).not.toBeInTheDocument();

    pr.error = 'some error message';
    pr.notifyIfError();

    expect(document.querySelector('.message')).toHaveTextContent(
      `${pr.error} ${noteOwner}`
    );
  });

  describe('clone()', () => {
    class TestProviderStore extends ProviderStore {
      constructor(props) {
        super(props);
      }

      makeNew() {
        return {
          ...super.makeNew(),
          testProperty: [],
        };
      }
    }

    let tps;

    beforeEach(() => {
      tps = new TestProviderStore();
    });

    it('creates a SHALLOW clone of store object', () => {
      expect(tps.clone().testProperty).toBe(tps.store.testProperty);
    });
  });

  describe('reset()', () => {
    class TestProviderStore extends ProviderStore {
      constructor(props) {
        super(props);
      }

      makeNew() {
        return {
          ...super.makeNew(),
          testProperty: [],
        };
      }
    }

    let tps;
    let spy;

    beforeEach(() => {
      tps = new TestProviderStore();
      spy = jest.spyOn(tps, 'makeNew');
    });

    it('resets store state, loading=|true|', () => {
      const newLoading = true;

      tps.setState = () => {};
      tps.store.testProperty = [1, 2, 3];

      tps.reset(newLoading);

      expect(spy).toHaveBeenCalled();
      expect(tps.store.testProperty).toHaveLength(0);
    });

    it('resets store state, loading=|false|', () => {
      tps.setState = () => {};
      tps.loaded = true;

      expect(tps.store).toMatchObject({
        loading: false,
        loaded: true,
        error: undefined,
      });
      tps.reset();
      expect(spy).toHaveBeenCalled();
      expect(tps.store).toMatchObject(defaultStoreObj);
    });
  });
});
