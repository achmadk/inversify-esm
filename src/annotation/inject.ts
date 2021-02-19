import { UNDEFINED_INJECT_ANNOTATION } from '../constants/error_msgs';
import { INJECT_TAG } from '../constants/metadata_keys';
import { ServiceIdentifier } from '../interfaces/interfaces';
import { Metadata } from '../planning/metadata';
import { tagParameter, tagProperty } from './decorator_utils';

export type ServiceIdentifierOrFunc =
  | ServiceIdentifier<any>
  | LazyServiceIdentifer;

export class LazyServiceIdentifer<T = any> {
  private _cb: () => ServiceIdentifier<T>;
  public constructor(cb: () => ServiceIdentifier<T>) {
    this._cb = cb;
  }

  public unwrap() {
    return this._cb();
  }
}

export function inject(serviceIdentifier: ServiceIdentifierOrFunc) {
  return function(target: any, targetKey: string, index?: number): void {
    if (serviceIdentifier === undefined) {
      throw new Error(UNDEFINED_INJECT_ANNOTATION(target.name));
    }

    const metadata = new Metadata(INJECT_TAG, serviceIdentifier);

    if (typeof index === 'number') {
      tagParameter(target, targetKey, index, metadata);
    } else {
      tagProperty(target, targetKey, metadata);
    }
  };
}
