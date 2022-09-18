import {
  hasOwnMetadata,
  getMetadata,
  defineMetadata,
} from '@abraham/reflection';

import { DUPLICATED_INJECTABLE_DECORATOR } from '../constants/error_msgs';
import { PARAM_TYPES, DESIGN_PARAM_TYPES } from '../constants/metadata_keys';

export function injectable() {
  return function <T extends abstract new (...args: never) => unknown>(
    target: T
  ) {
    if (hasOwnMetadata(PARAM_TYPES, target)) {
      throw new Error(DUPLICATED_INJECTABLE_DECORATOR);
    }

    const types = getMetadata(DESIGN_PARAM_TYPES, target) ?? [];
    defineMetadata(PARAM_TYPES, types, target);

    return target;
  };
}
