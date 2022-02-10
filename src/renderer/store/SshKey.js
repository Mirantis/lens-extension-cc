import * as rtv from 'rtvjs';
import { ApiObject } from './ApiObject';

export class SshKey extends ApiObject {
  constructor(data) {
    super();
    DEV_ENV && rtv.verify(data, rtv.OBJECT);
  }
}
