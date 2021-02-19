import { OPTIONAL_TAG } from '../constants/metadata_keys';
import { Metadata } from '../planning/metadata';
import { tagParameter, tagProperty } from './decorator_utils';

export function optional() {
  return function(target: any, targetKey: string, index?: number) {
    const metadata = new Metadata(OPTIONAL_TAG, true);

    if (typeof index === 'number') {
      tagParameter(target, targetKey, index, metadata);
    } else {
      tagProperty(target, targetKey, metadata);
    }
  };
}
