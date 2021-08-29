import { BindingCount } from '../bindings/binding_count';
import {
  NOT_REGISTERED,
  AMBIGUOUS_MATCH,
  ARGUMENTS_LENGTH_MISMATCH,
} from '../constants/error_msgs';
import { BindingTypeEnum, TargetTypeEnum } from '../constants/literal_types';
import { INJECT_TAG, MULTI_INJECT_TAG } from '../constants/metadata_keys';
import {
  Lookup,
  Binding,
  TargetType,
  ServiceIdentifier,
  Target as ITarget,
  MetadataReaderInterface,
  Context as IContext,
  Request as IRequest,
  ContainerInterface,
} from '../interfaces/interfaces';
import { isStackOverflowExeption } from '../utils/exceptions';
import {
  circularDependencyToException,
  getServiceIdentifierAsString,
  listMetadataForTarget,
  listRegisteredBindingsForServiceIdentifier,
} from '../utils/serialization';
import { Context } from './context';
import { Metadata } from './metadata';
import { Plan } from './plan';
import {
  getBaseClassDependencyCount,
  getDependencies,
  getFunctionName,
} from './reflection_utils';
import { Request } from './request';
import { Target } from './target';

export function getBindingDictionary<T = any>(
  container: any
): Lookup<Binding<T>> {
  return container._bindingDictionary;
}

function _createTarget(
  isMultiInject: boolean,
  targetType: TargetType,
  serviceIdentifier: ServiceIdentifier<any>,
  name: string,
  key?: string | number | symbol,
  value?: any
): ITarget {
  const metadataKey = isMultiInject ? MULTI_INJECT_TAG : INJECT_TAG;
  const injectMetadata = new Metadata(metadataKey, serviceIdentifier);
  const target = new Target(
    targetType,
    name,
    serviceIdentifier,
    injectMetadata
  );

  if (key !== undefined) {
    const tagMetadata = new Metadata(key, value);
    target.metadata.push(tagMetadata);
  }

  return target;
}

function _getActiveBindings(
  metadataReader: MetadataReaderInterface,
  avoidConstraints: boolean,
  context: IContext,
  parentRequest: IRequest | null,
  target: ITarget
): Binding<any>[] {
  let bindings = getBindings<any>(context.container, target.serviceIdentifier);
  let activeBindings: Binding<any>[] = [];

  // automatic binding
  if (
    bindings.length === BindingCount.NoBindingsAvailable &&
    context.container.options.autoBindInjectable &&
    typeof target.serviceIdentifier === 'function' &&
    metadataReader.getConstructorMetadata(target.serviceIdentifier)
      .compilerGeneratedMetadata
  ) {
    context.container.bind(target.serviceIdentifier).toSelf();
    bindings = getBindings(context.container, target.serviceIdentifier);
  }

  // multiple bindings available
  if (!avoidConstraints) {
    // apply constraints if available to reduce the number of active bindings
    activeBindings = bindings.filter((binding) => {
      const request = new Request(
        binding.serviceIdentifier,
        context,
        parentRequest,
        binding,
        target
      );

      return binding.constraint(request);
    });
  } else {
    // simple injection or multi-injection without constraints
    activeBindings = bindings;
  }

  // validate active bindings
  _validateActiveBindingCount(
    target.serviceIdentifier,
    activeBindings,
    target,
    context.container
  );

  return activeBindings;
}

function _validateActiveBindingCount(
  serviceIdentifier: ServiceIdentifier<any>,
  bindings: Binding<any>[],
  target: ITarget,
  container: ContainerInterface
): Binding<any>[] {
  switch (bindings.length) {
    case BindingCount.NoBindingsAvailable:
      if (target.isOptional()) {
        return bindings;
      } else {
        const serviceIdentifierString =
          getServiceIdentifierAsString(serviceIdentifier);
        let msg = NOT_REGISTERED;
        msg += listMetadataForTarget(serviceIdentifierString, target);
        msg += listRegisteredBindingsForServiceIdentifier(
          container,
          serviceIdentifierString,
          getBindings
        );
        throw new Error(msg);
      }

    // @ts-ignore
    case BindingCount.OnlyOneBindingAvailable:
      if (!target.isArray()) {
        return bindings;
      }

    // eslint-disable no-fallthrough
    case BindingCount.MultipleBindingsAvailable:
    default:
      if (!target.isArray()) {
        const serviceIdentifierString =
          getServiceIdentifierAsString(serviceIdentifier);
        let msg = `${AMBIGUOUS_MATCH} ${serviceIdentifierString}`;
        msg += listRegisteredBindingsForServiceIdentifier(
          container,
          serviceIdentifierString,
          getBindings
        );
        throw new Error(msg);
      } else {
        return bindings;
      }
  }
}

function _createSubRequests(
  metadataReader: MetadataReaderInterface,
  avoidConstraints: boolean,
  serviceIdentifier: ServiceIdentifier<any>,
  context: Context,
  parentRequest: Request | null,
  target: ITarget
) {
  let activeBindings: Binding<any>[];
  let childRequest: Request;

  if (parentRequest === null) {
    activeBindings = _getActiveBindings(
      metadataReader,
      avoidConstraints,
      context,
      null,
      target
    );

    childRequest = new Request(
      serviceIdentifier,
      context,
      null,
      activeBindings,
      target
    );

    const thePlan = new Plan(context, childRequest);
    context.addPlan(thePlan);
  } else {
    activeBindings = _getActiveBindings(
      metadataReader,
      avoidConstraints,
      context,
      parentRequest,
      target
    );
    childRequest = parentRequest.addChildRequest(
      target.serviceIdentifier,
      activeBindings,
      target
    );
  }

  activeBindings.forEach((binding) => {
    let subChildRequest: Request | null = null;

    if (target.isArray()) {
      subChildRequest = childRequest.addChildRequest(
        binding.serviceIdentifier,
        binding,
        target
      );
    } else {
      if (binding.cache) {
        return;
      }
      subChildRequest = childRequest;
    }

    if (
      binding.type === BindingTypeEnum.Instance &&
      binding.implementationType !== null
    ) {
      const dependencies = getDependencies(
        metadataReader,
        binding.implementationType
      );

      if (!context.container.options.skipBaseClassChecks) {
        // Throw if a derived class does not implement its constructor explicitly
        // We do this to prevent errors when a base class (parent) has dependencies
        // and one of the derived classes (children) has no dependencies
        const baseClassDependencyCount = getBaseClassDependencyCount(
          metadataReader,
          binding.implementationType
        );

        if (dependencies.length < baseClassDependencyCount) {
          const error = ARGUMENTS_LENGTH_MISMATCH(
            getFunctionName(binding.implementationType)
          );
          throw new Error(error);
        }
      }

      dependencies.forEach((dependency: ITarget) => {
        _createSubRequests(
          metadataReader,
          false,
          dependency.serviceIdentifier,
          context,
          subChildRequest,
          dependency
        );
      });
    }
  });
}

function getBindings<T>(
  container: ContainerInterface,
  serviceIdentifier: ServiceIdentifier<T>
): Binding<T>[] {
  let bindings: Binding<T>[] = [];
  const bindingDictionary: Lookup<Binding<any>> =
    getBindingDictionary(container);

  if (bindingDictionary.hasKey(serviceIdentifier)) {
    bindings = bindingDictionary.get(serviceIdentifier);
  } else if (container.parent !== null) {
    // recursively try to get bindings from parent container
    bindings = getBindings<T>(container.parent, serviceIdentifier);
  }

  return bindings;
}

export function plan(
  metadataReader: MetadataReaderInterface,
  container: ContainerInterface,
  isMultiInject: boolean,
  targetType: TargetType,
  serviceIdentifier: ServiceIdentifier<any>,
  key?: string | number | symbol,
  value?: any,
  avoidConstraints = false
): Context {
  const context = new Context(container);
  const target = _createTarget(
    isMultiInject,
    targetType,
    serviceIdentifier,
    '',
    key,
    value
  );

  try {
    _createSubRequests(
      metadataReader,
      avoidConstraints,
      serviceIdentifier,
      context,
      null,
      target
    );
    return context;
  } catch (error) {
    if (error instanceof Error && isStackOverflowExeption(error)) {
      if (context.plan) {
        circularDependencyToException(context.plan.rootRequest);
      }
    }
    throw error;
  }
}

export function createMockRequest(
  container: ContainerInterface,
  serviceIdentifier: ServiceIdentifier<any>,
  key: string | number | symbol,
  value: any
): Request {
  const target = new Target(
    TargetTypeEnum.Variable,
    '',
    serviceIdentifier,
    new Metadata(key, value)
  );
  const context = new Context(container);
  const request = new Request(serviceIdentifier, context, null, [], target);
  return request;
}
