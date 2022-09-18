import { ServiceIdentifier } from '../interfaces';

export type ServiceIdentifierOrFunc<T> =
  | ServiceIdentifier<T>
  | LazyServiceIdentifer<T>;

export class LazyServiceIdentifer<T = unknown> {
  private _cb: () => ServiceIdentifier<T>;
  public constructor(cb: () => ServiceIdentifier<T>) {
    this._cb = cb;
  }

  public unwrap() {
    return this._cb();
  }
}
