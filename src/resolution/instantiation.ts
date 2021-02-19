import { POST_CONSTRUCT_ERROR } from '../constants/error_msgs';
import { TargetTypeEnum } from '../constants/literal_types';
import { POST_CONSTRUCT } from '../constants/metadata_keys';
import {
  Request,
  ResolveRequestHandler,
  Newable,
} from '../interfaces/interfaces';
import { Metadata } from '../planning/metadata';

function _injectProperties(
  instance: any,
  childRequests: Request[],
  resolveRequest: ResolveRequestHandler
): any {
  const propertyInjectionsRequests = childRequests.filter(
    (childRequest: Request) =>
      childRequest.target !== null &&
      childRequest.target.type === TargetTypeEnum.ClassProperty
  );

  const propertyInjections = propertyInjectionsRequests.map(resolveRequest);

  propertyInjectionsRequests.forEach((r: Request, index: number) => {
    let propertyName = '';
    propertyName = r.target.name.value();
    const injection = propertyInjections[index];
    instance[propertyName] = injection;
  });

  return instance;
}

function _createInstance(Func: Newable<any>, injections: Object[]): any {
  // @ts-ignore
  return new Func(...injections);
}

function _postConstruct(constr: Newable<any>, result: any): void {
  if (Reflect.hasMetadata(POST_CONSTRUCT, constr)) {
    const data: Metadata = Reflect.getMetadata(POST_CONSTRUCT, constr);
    try {
      result[data.value]();
    } catch (e) {
      throw new Error(POST_CONSTRUCT_ERROR(constr.name, e.message));
    }
  }
}

export function resolveInstance(
  constr: Newable<any>,
  childRequests: Request[],
  resolveRequest: ResolveRequestHandler
): any {
  let result: any = null;

  if (childRequests.length > 0) {
    const constructorInjectionsRequests = childRequests.filter(
      (childRequest: Request) =>
        childRequest.target !== null &&
        childRequest.target.type === TargetTypeEnum.ConstructorArgument
    );

    const constructorInjections = constructorInjectionsRequests.map(
      resolveRequest
    );

    result = _createInstance(constr, constructorInjections);
    result = _injectProperties(result, childRequests, resolveRequest);
  } else {
    result = new constr();
  }
  _postConstruct(constr, result);

  return result;
}
