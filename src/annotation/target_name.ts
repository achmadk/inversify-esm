import { NAME_TAG } from '../constants/metadata_keys';
import { Metadata } from '../planning/metadata';
import { DecoratorTarget, tagParameter } from './decorator_utils';

export function targetName(name: string) {
  return function (target: DecoratorTarget, targetKey: string, index: number) {
    const metadata = new Metadata(NAME_TAG, name);
    tagParameter(target, targetKey, index, metadata);
  };
}
