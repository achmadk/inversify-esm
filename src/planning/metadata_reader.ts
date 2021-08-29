import { getMetadata } from '@abraham/reflection';

import { PARAM_TYPES, TAGGED, TAGGED_PROP } from '../constants/metadata_keys';
import {
  MetadataReaderInterface,
  ConstructorMetadata,
  MetadataMap,
} from '../interfaces/interfaces';

export class MetadataReader implements MetadataReaderInterface {
  public getConstructorMetadata(
    constructorFunc: Function
  ): ConstructorMetadata {
    // TypeScript compiler generated annotations
    const compilerGeneratedMetadata = getMetadata<Function[] | undefined>(
      PARAM_TYPES,
      constructorFunc
    );

    // User generated constructor annotations
    const userGeneratedMetadata = getMetadata<MetadataMap>(
      TAGGED,
      constructorFunc
    );

    return {
      compilerGeneratedMetadata,
      userGeneratedMetadata: userGeneratedMetadata || {},
    };
  }

  public getPropertiesMetadata(constructorFunc: Function): MetadataMap {
    // User generated properties annotations
    const userGeneratedMetadata =
      getMetadata<MetadataMap>(TAGGED_PROP, constructorFunc) ||
      ([] as unknown as MetadataMap);
    return userGeneratedMetadata;
  }
}
