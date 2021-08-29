import { NULL_ARGUMENT, KEY_NOT_FOUND } from '../constants/error_msgs';
import {
  Clonable,
  Lookup as LookupInterface,
  ServiceIdentifier,
} from '../interfaces/interfaces';

export class Lookup<T extends Clonable<T>> implements LookupInterface<T> {
  // dictionary used store multiple values for each key <key>
  private _map: Map<ServiceIdentifier<any>, T[]>;

  public constructor() {
    this._map = new Map<ServiceIdentifier<any>, T[]>();
  }

  public getMap() {
    return this._map;
  }

  // adds a new entry to _map
  public add(serviceIdentifier: ServiceIdentifier<any>, value: T): void {
    if (serviceIdentifier === null || serviceIdentifier === undefined) {
      throw new Error(NULL_ARGUMENT);
    }

    if (value === null || value === undefined) {
      throw new Error(NULL_ARGUMENT);
    }

    const entry = this._map.get(serviceIdentifier);
    if (entry !== undefined) {
      entry.push(value);
      this._map.set(serviceIdentifier, entry);
    } else {
      this._map.set(serviceIdentifier, [value]);
    }
  }

  // gets the value of a entry by its key (serviceIdentifier)
  public get(serviceIdentifier: ServiceIdentifier<any>): T[] {
    if (serviceIdentifier === null || serviceIdentifier === undefined) {
      throw new Error(NULL_ARGUMENT);
    }

    const entry = this._map.get(serviceIdentifier);

    if (entry !== undefined) {
      return entry;
    } else {
      throw new Error(KEY_NOT_FOUND);
    }
  }

  // removes a entry from _map by its key (serviceIdentifier)
  public remove(serviceIdentifier: ServiceIdentifier<any>): void {
    if (serviceIdentifier === null || serviceIdentifier === undefined) {
      throw new Error(NULL_ARGUMENT);
    }

    if (!this._map.delete(serviceIdentifier)) {
      throw new Error(KEY_NOT_FOUND);
    }
  }

  public removeByCondition(condition: (item: T) => boolean): void {
    this._map.forEach((entries, key) => {
      const updatedEntries = entries.filter((entry) => !condition(entry));
      if (updatedEntries.length > 0) {
        this._map.set(key, updatedEntries);
      } else {
        this._map.delete(key);
      }
    });
  }

  // returns true if _map contains a key (serviceIdentifier)
  public hasKey(serviceIdentifier: ServiceIdentifier<any>): boolean {
    if (serviceIdentifier === null || serviceIdentifier === undefined) {
      throw new Error(NULL_ARGUMENT);
    }

    return this._map.has(serviceIdentifier);
  }

  // returns a new Lookup instance; note: this is not a deep clone, only Lookup related data structure (dictionary) is
  // cloned, content remains the same
  public clone(): LookupInterface<T> {
    const copy = new Lookup<T>();

    this._map.forEach((value, key) => {
      value.forEach((b) => copy.add(key, b.clone()));
    });

    return copy;
  }

  public traverse(
    func: (key: ServiceIdentifier<any>, value: T[]) => void
  ): void {
    this._map.forEach((value, key) => {
      func(key, value);
    });
  }
}
