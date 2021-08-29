import {
  NAMED_TAG,
  MULTI_INJECT_TAG,
  NAME_TAG,
  UNMANAGED_TAG,
  OPTIONAL_TAG,
  INJECT_TAG,
} from '../constants/metadata_keys';
import {
  Target as ITarget,
  TargetType,
  ServiceIdentifier,
  QueryableString as IQueryableString,
  Metadata as IMetadata,
} from '../interfaces/interfaces';
import { id } from '../utils/id';
import { Metadata } from './metadata';
import { QueryableString } from './queryable_string';

export class Target implements ITarget {
  public id: number;
  public type: TargetType;
  public serviceIdentifier: ServiceIdentifier<any>;
  public name: IQueryableString;
  public metadata: Metadata[];

  public constructor(
    type: TargetType,
    name: string,
    serviceIdentifier: ServiceIdentifier<any>,
    namedOrTagged?: string | Metadata
  ) {
    this.id = id();
    this.type = type;
    this.serviceIdentifier = serviceIdentifier;
    this.name = new QueryableString(name || '');
    this.metadata = new Array<Metadata>();

    let metadataItem: IMetadata | null = null;

    // is named target
    if (typeof namedOrTagged === 'string') {
      metadataItem = new Metadata(NAMED_TAG, namedOrTagged);
    } else if (namedOrTagged instanceof Metadata) {
      // is target with metadata
      metadataItem = namedOrTagged;
    }

    // target has metadata
    if (metadataItem !== null) {
      this.metadata.push(metadataItem);
    }
  }

  public hasTag(key: string): boolean {
    for (const m of this.metadata) {
      if (m.key === key) {
        return true;
      }
    }
    return false;
  }

  public isArray(): boolean {
    return this.hasTag(MULTI_INJECT_TAG);
  }

  public matchesArray(name: ServiceIdentifier<any>): boolean {
    return this.matchesTag(MULTI_INJECT_TAG)(name);
  }

  public isNamed(): boolean {
    return this.hasTag(NAMED_TAG);
  }

  public isTagged(): boolean {
    return this.metadata.some(
      (m) =>
        m.key !== INJECT_TAG &&
        m.key !== MULTI_INJECT_TAG &&
        m.key !== NAME_TAG &&
        m.key !== UNMANAGED_TAG &&
        m.key !== NAMED_TAG
    );
  }

  public isOptional(): boolean {
    return this.matchesTag(OPTIONAL_TAG)(true);
  }

  public getNamedTag(): IMetadata | null {
    if (this.isNamed()) {
      return this.metadata.filter((m) => m.key === NAMED_TAG)[0];
    }
    return null;
  }

  public getCustomTags(): IMetadata[] | null {
    if (this.isTagged()) {
      return this.metadata.filter(
        (m) =>
          m.key !== INJECT_TAG &&
          m.key !== MULTI_INJECT_TAG &&
          m.key !== NAME_TAG &&
          m.key !== UNMANAGED_TAG &&
          m.key !== NAMED_TAG
      );
    }
    return null;
  }

  public matchesNamedTag(name: string): boolean {
    return this.matchesTag(NAMED_TAG)(name);
  }

  public matchesTag(key: string) {
    return (value: any) => {
      for (const m of this.metadata) {
        if (m.key === key && m.value === value) {
          return true;
        }
      }
      return false;
    };
  }
}
