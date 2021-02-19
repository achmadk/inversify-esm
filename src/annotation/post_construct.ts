import { MULTIPLE_POST_CONSTRUCT_METHODS } from '../constants/error_msgs';
import { POST_CONSTRUCT } from '../constants/metadata_keys';
import { Metadata } from '../planning/metadata';

export function postConstruct() {
  return function(
    target: any,
    propertyKey: string,
    _descriptor: PropertyDescriptor
  ) {
    const metadata = new Metadata(POST_CONSTRUCT, propertyKey);

    if (Reflect.hasOwnMetadata(POST_CONSTRUCT, target.constructor)) {
      throw new Error(MULTIPLE_POST_CONSTRUCT_METHODS);
    }
    Reflect.defineMetadata(POST_CONSTRUCT, metadata, target.constructor);
  };
}
