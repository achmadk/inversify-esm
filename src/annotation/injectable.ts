import { DUPLICATED_INJECTABLE_DECORATOR } from '../constants/error_msgs';
import { PARAM_TYPES, DESIGN_PARAM_TYPES } from '../constants/metadata_keys';

export function injectable() {
  return function(target: any) {
    if (Reflect.hasOwnMetadata(PARAM_TYPES, target)) {
      throw new Error(DUPLICATED_INJECTABLE_DECORATOR);
    }

    const types = Reflect.getMetadata(DESIGN_PARAM_TYPES, target) || [];
    Reflect.defineMetadata(PARAM_TYPES, types, target);

    return target;
  };
}
