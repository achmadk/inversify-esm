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
    const compilerGeneratedMetadata = Reflect.getMetadata(
      PARAM_TYPES,
      constructorFunc
    );

    // User generated constructor annotations
    const userGeneratedMetadata = Reflect.getMetadata(TAGGED, constructorFunc);

    return {
      compilerGeneratedMetadata,
      userGeneratedMetadata: userGeneratedMetadata || {},
    };
  }

  public getPropertiesMetadata(constructorFunc: Function): MetadataMap {
    // User generated properties annotations
    const userGeneratedMetadata =
      Reflect.getMetadata(TAGGED_PROP, constructorFunc) || [];
    return userGeneratedMetadata;
  }
}
