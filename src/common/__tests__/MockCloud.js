import { makeFakeCloud } from '../../__tests__/cloudTestUtil';

export class Cloud {
  constructor(urlOrSpec, options) {
    const fakeCloud = makeFakeCloud(
      typeof urlOrSpec === 'string'
        ? { cloudUrl: urlOrSpec, ...options }
        : urlOrSpec
    );

    // now apply all `fakeCloud` properties to this class instance
    Object.keys(fakeCloud).forEach((key) => (this[key] = fakeCloud[key]));
  }
}
