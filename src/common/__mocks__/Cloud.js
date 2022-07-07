import { makeFakeCloud } from '../../__tests__/cloudTestUtil';

export class Cloud {
  constructor(urlOrSpec, options) {
    const fakeCloud = makeFakeCloud(
      typeof urlOrSpec === 'string'
        ? { cloudUrl: urlOrSpec, ...options }
        : urlOrSpec
    );

    // NOTE: returning an object from a constructor means the object
    //  returned will become the class's instance object (i.e. it will
    //  become `this`) -- kind of a hack, but this is a mock after all
    return fakeCloud;
  }
}

// export class Cloud {
//   constructor(urlOrSpec, options) {
//     const fakeCloud = makeFakeCloud(
//       typeof urlOrSpec === 'string'
//         ? { cloudUrl: urlOrSpec, ...options }
//         : urlOrSpec
//     );


//     Object.keys(fakeCloud).forEach((key) => (this[key] = fakeCloud[key]));
//   }
// }
