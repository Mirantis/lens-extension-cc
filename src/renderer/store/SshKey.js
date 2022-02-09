import * as rtv from 'rtvjs';

export class SshKey {
  constructor(data) {
    DEV_ENV && rtv.verify(data, rtv.OBJECT);
  }
}
