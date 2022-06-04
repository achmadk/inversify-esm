import { UNMANAGED_TAG } from '../constants/metadata_keys';
import { Metadata } from '../planning/metadata';
import { DecoratorTarget, tagParameter } from './decorator_utils';

export function unmanaged() {
  return function (target: DecoratorTarget, targetKey: string, index: number) {
    const metadata = new Metadata(UNMANAGED_TAG, true);
    tagParameter(target, targetKey, index, metadata);
  };
}
