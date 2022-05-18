import { TextDecoder, TextEncoder } from 'util'; // node built-in package
import JestEnvironmentJsdom from 'jest-environment-jsdom';

// custom environment to set the TextDecoder/TextEncoder that are required by
//  openid-client which is used by Lens
export default class CustomTestEnvironment extends JestEnvironmentJsdom {
  async setup() {
    await super.setup();

    if (!this.global.TextDecoder) {
      this.global.TextDecoder = TextDecoder;
    }

    if (!this.global.TextEncoder) {
      this.global.TextEncoder = TextEncoder;
    }
  }
}
