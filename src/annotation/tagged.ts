import { Metadata } from '../planning/metadata';
import { tagParameter, tagProperty } from './decorator_utils';

// Used to add custom metadata which is used to resolve metadata-based contextual bindings.
export function tagged(
  metadataKey: string | number | symbol,
  metadataValue: any
) {
  return function(target: any, targetKey: string, index?: number) {
    const metadata = new Metadata(metadataKey, metadataValue);
    if (typeof index === 'number') {
      tagParameter(target, targetKey, index, metadata);
    } else {
      tagProperty(target, targetKey, metadata);
    }
  };
}
