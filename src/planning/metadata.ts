import { NAMED_TAG } from '../constants/metadata_keys';
import { Metadata as IMetadata } from '../interfaces/interfaces';

export class Metadata implements IMetadata {
  public key: string | number | symbol;
  public value: any;

  public constructor(key: string | number | symbol, value: any) {
    this.key = key;
    this.value = value;
  }

  public toString() {
    if (this.key === NAMED_TAG) {
      return `named: ${this.value.toString()} `;
    } else {
      return `tagged: { key:${this.key.toString()}, value: ${this.value} }`;
    }
  }
}
