import { Binding } from '../bindings/binding';
import {
  CONTAINER_OPTIONS_MUST_BE_AN_OBJECT,
  CONTAINER_OPTIONS_INVALID_DEFAULT_SCOPE,
  CONTAINER_OPTIONS_INVALID_AUTO_BIND_INJECTABLE,
  CONTAINER_OPTIONS_INVALID_SKIP_BASE_CHECK,
  CANNOT_UNBIND,
  NO_MORE_SNAPSHOTS_AVAILABLE,
  INVALID_MIDDLEWARE_RETURN,
} from '../constants/error_msgs';
import { BindingScopeEnum, TargetTypeEnum } from '../constants/literal_types';
import { NAMED_TAG } from '../constants/metadata_keys';
import {
  ContainerInterface,
  ContainerOptions,
  Next,
  Binding as BindingInterface,
  ContainerSnapshot as ContainerSnapshotInterface,
  MetadataReaderInterface,
  ContainerModuleInterface,
  AsyncContainerModuleInterface,
  ServiceIdentifier,
  BindingToSyntax as BindingToSyntaxInterface,
  Middleware,
  Newable,
  TargetType,
  NextArgs,
  Context,
} from '../interfaces/interfaces';
import { MetadataReader } from '../planning/metadata_reader';
import {
  createMockRequest,
  getBindingDictionary,
  plan,
} from '../planning/planner';
import { resolve } from '../resolution/resolver';
import { BindingToSyntax } from '../syntax/binding_to_syntax';
import { id } from '../utils/id';
import { getServiceIdentifierAsString } from '../utils/serialization';
import { ContainerSnapshot } from './container_snapshot';
import { Lookup } from './lookup';

class Container implements ContainerInterface {
  public id: number;
  public parent: Container | null;
  public readonly options: ContainerOptions;
  private _middleware: Next | null;
  private _bindingDictionary: Lookup<BindingInterface<any>>;
  private _snapshots: ContainerSnapshotInterface[];
  private _metadataReader: MetadataReaderInterface;

  public static merge(container1: Container, container2: Container): Container {
    const container = new Container();
    // @ts-ignore
    const bindingDictionary: Lookup<BindingInterface<
      any
    >> = getBindingDictionary(container);
    // @ts-ignore
    const bindingDictionary1: Lookup<BindingInterface<
      any
    >> = getBindingDictionary(container1);
    // @ts-ignore
    const bindingDictionary2: Lookup<BindingInterface<
      any
    >> = getBindingDictionary(container2);

    function copyDictionary(
      origin: Lookup<BindingInterface<any>>,
      destination: Lookup<BindingInterface<any>>
    ) {
      origin.traverse((_key, value) => {
        value.forEach(binding => {
          destination.add(binding.serviceIdentifier, binding.clone());
        });
      });
    }

    copyDictionary(bindingDictionary1, bindingDictionary);
    copyDictionary(bindingDictionary2, bindingDictionary);

    return container;
  }

  public constructor(containerOptions?: ContainerOptions) {
    const options = containerOptions || {};
    if (typeof options !== 'object') {
      throw new Error(`${CONTAINER_OPTIONS_MUST_BE_AN_OBJECT}`);
    }

    if (options.defaultScope === undefined) {
      options.defaultScope = BindingScopeEnum.Transient;
    } else if (
      options.defaultScope !== BindingScopeEnum.Singleton &&
      options.defaultScope !== BindingScopeEnum.Transient &&
      options.defaultScope !== BindingScopeEnum.Request
    ) {
      throw new Error(`${CONTAINER_OPTIONS_INVALID_DEFAULT_SCOPE}`);
    }

    if (options.autoBindInjectable === undefined) {
      options.autoBindInjectable = false;
    } else if (typeof options.autoBindInjectable !== 'boolean') {
      throw new Error(`${CONTAINER_OPTIONS_INVALID_AUTO_BIND_INJECTABLE}`);
    }

    if (options.skipBaseClassChecks === undefined) {
      options.skipBaseClassChecks = false;
    } else if (typeof options.skipBaseClassChecks !== 'boolean') {
      throw new Error(`${CONTAINER_OPTIONS_INVALID_SKIP_BASE_CHECK}`);
    }

    this.options = {
      autoBindInjectable: options.autoBindInjectable,
      defaultScope: options.defaultScope,
      skipBaseClassChecks: options.skipBaseClassChecks,
    };

    this.id = id();
    this._bindingDictionary = new Lookup<BindingInterface<any>>();
    this._snapshots = [];
    this._middleware = null;
    this.parent = null;
    this._metadataReader = new MetadataReader();
  }

  public load(...modules: ContainerModuleInterface[]) {
    const getHelpers = this._getContainerModuleHelpersFactory();

    for (const currentModule of modules) {
      const containerModuleHelpers = getHelpers(currentModule.id);

      currentModule.registry(
        containerModuleHelpers.bindFunction,
        containerModuleHelpers.unbindFunction,
        containerModuleHelpers.isboundFunction,
        containerModuleHelpers.rebindFunction
      );
    }
  }

  public async loadAsync(...modules: AsyncContainerModuleInterface[]) {
    const getHelpers = this._getContainerModuleHelpersFactory();

    for (const currentModule of modules) {
      const containerModuleHelpers = getHelpers(currentModule.id);

      await currentModule.registry(
        containerModuleHelpers.bindFunction,
        containerModuleHelpers.unbindFunction,
        containerModuleHelpers.isboundFunction,
        containerModuleHelpers.rebindFunction
      );
    }
  }

  public unload(...modules: ContainerModuleInterface[]): void {
    const conditionFactory = (expected: any) => (
      item: BindingInterface<any>
    ): boolean => item.moduleId === expected;

    modules.forEach(module => {
      const condition = conditionFactory(module.id);
      this._bindingDictionary.removeByCondition(condition);
    });
  }

  // Registers a type binding
  public bind<T>(
    serviceIdentifier: ServiceIdentifier<T>
  ): BindingToSyntaxInterface<T> {
    const scope = this.options.defaultScope || BindingScopeEnum.Transient;
    const binding = new Binding<T>(
      serviceIdentifier,
      scope
    ) as BindingInterface<any>;
    this._bindingDictionary.add(serviceIdentifier, binding);
    return new BindingToSyntax<T>(binding);
  }

  public rebind<T>(
    serviceIdentifier: ServiceIdentifier<T>
  ): BindingToSyntaxInterface<T> {
    this.unbind(serviceIdentifier);
    return this.bind(serviceIdentifier);
  }

  // Removes a type binding from the registry by its key
  public unbind(serviceIdentifier: ServiceIdentifier<any>): void {
    try {
      this._bindingDictionary.remove(serviceIdentifier);
    } catch (e) {
      throw new Error(
        `${CANNOT_UNBIND} ${getServiceIdentifierAsString(serviceIdentifier)}`
      );
    }
  }

  // Removes all the type bindings from the registry
  public unbindAll(): void {
    this._bindingDictionary = new Lookup<BindingInterface<any>>();
  }

  // Allows to check if there are bindings available for serviceIdentifier
  public isBound(serviceIdentifier: ServiceIdentifier<any>): boolean {
    let bound = this._bindingDictionary.hasKey(serviceIdentifier);
    if (!bound && this.parent) {
      bound = this.parent.isBound(serviceIdentifier);
    }
    return bound;
  }

  public isBoundNamed(
    serviceIdentifier: ServiceIdentifier<any>,
    named: string | number | symbol
  ): boolean {
    return this.isBoundTagged(serviceIdentifier, NAMED_TAG, named);
  }

  // Check if a binding with a complex constraint is available without throwing a error. Ancestors are also verified.
  public isBoundTagged(
    serviceIdentifier: ServiceIdentifier<any>,
    key: string | number | symbol,
    value: any
  ): boolean {
    let bound = false;

    // verify if there are bindings available for serviceIdentifier on current binding dictionary
    if (this._bindingDictionary.hasKey(serviceIdentifier)) {
      const bindings = this._bindingDictionary.get(serviceIdentifier);
      const request = createMockRequest(this, serviceIdentifier, key, value);
      bound = bindings.some(b => b.constraint(request));
    }

    // verify if there is a parent container that could solve the request
    if (!bound && this.parent) {
      bound = this.parent.isBoundTagged(serviceIdentifier, key, value);
    }

    return bound;
  }

  public snapshot(): void {
    this._snapshots.push(
      ContainerSnapshot.of(this._bindingDictionary.clone(), this._middleware)
    );
  }

  public restore(): void {
    const snapshot = this._snapshots.pop();
    if (snapshot === undefined) {
      throw new Error(NO_MORE_SNAPSHOTS_AVAILABLE);
    }
    // @ts-ignore
    this._bindingDictionary = snapshot.bindings;
    this._middleware = snapshot.middleware;
  }

  public createChild(containerOptions?: ContainerOptions): Container {
    const child = new Container(containerOptions || this.options);
    child.parent = this;
    return child;
  }

  public applyMiddleware(...middlewares: Middleware[]): void {
    const initial: Next = this._middleware
      ? this._middleware
      : this._planAndResolve();
    this._middleware = middlewares.reduce((prev, curr) => curr(prev), initial);
  }

  public applyCustomMetadataReader(metadataReader: MetadataReader) {
    this._metadataReader = metadataReader;
  }

  // Resolves a dependency by its runtime identifier
  // The runtime identifier must be associated with only one binding
  // use getAll when the runtime identifier is associated with multiple bindings
  public get<T>(serviceIdentifier: ServiceIdentifier<T>): T {
    return this._get<T>(
      false,
      false,
      TargetTypeEnum.Variable,
      serviceIdentifier
    ) as T;
  }

  public getTagged<T>(
    serviceIdentifier: ServiceIdentifier<T>,
    key: string | number | symbol,
    value: any
  ): T {
    return this._get<T>(
      false,
      false,
      TargetTypeEnum.Variable,
      serviceIdentifier,
      key,
      value
    ) as T;
  }

  public getNamed<T>(
    serviceIdentifier: ServiceIdentifier<T>,
    named: string | number | symbol
  ): T {
    return this.getTagged<T>(serviceIdentifier, NAMED_TAG, named);
  }

  // Resolves a dependency by its runtime identifier
  // The runtime identifier can be associated with one or multiple bindings
  public getAll<T>(serviceIdentifier: ServiceIdentifier<T>): T[] {
    return this._get<T>(
      true,
      true,
      TargetTypeEnum.Variable,
      serviceIdentifier
    ) as T[];
  }

  public getAllTagged<T>(
    serviceIdentifier: ServiceIdentifier<T>,
    key: string | number | symbol,
    value: any
  ): T[] {
    return this._get<T>(
      false,
      true,
      TargetTypeEnum.Variable,
      serviceIdentifier,
      key,
      value
    ) as T[];
  }

  public getAllNamed<T>(
    serviceIdentifier: ServiceIdentifier<T>,
    named: string | number | symbol
  ): T[] {
    return this.getAllTagged<T>(serviceIdentifier, NAMED_TAG, named);
  }

  public resolve<T>(constructorFunction: Newable<T>) {
    const tempContainer = this.createChild();
    tempContainer.bind<T>(constructorFunction).toSelf();
    return tempContainer.get<T>(constructorFunction);
  }

  private _getContainerModuleHelpersFactory() {
    const setModuleId = (bindingToSyntax: any, moduleId: number) => {
      bindingToSyntax._binding.moduleId = moduleId;
    };

    const getBindFunction = (moduleId: number) => (
      serviceIdentifier: ServiceIdentifier<any>
    ) => {
      const _bind = this.bind.bind(this);
      const bindingToSyntax = _bind(serviceIdentifier);
      setModuleId(bindingToSyntax, moduleId);
      return bindingToSyntax;
    };

    const getUnbindFunction = (_moduleId: number) => (
      serviceIdentifier: ServiceIdentifier<any>
    ) => {
      const _unbind = this.unbind.bind(this);
      _unbind(serviceIdentifier);
    };

    const getIsboundFunction = (_moduleId: number) => (
      serviceIdentifier: ServiceIdentifier<any>
    ) => {
      const _isBound = this.isBound.bind(this);
      return _isBound(serviceIdentifier);
    };

    const getRebindFunction = (moduleId: number) => (
      serviceIdentifier: ServiceIdentifier<any>
    ) => {
      const _rebind = this.rebind.bind(this);
      const bindingToSyntax = _rebind(serviceIdentifier);
      setModuleId(bindingToSyntax, moduleId);
      return bindingToSyntax;
    };

    return (mId: number) => ({
      bindFunction: getBindFunction(mId),
      isboundFunction: getIsboundFunction(mId),
      rebindFunction: getRebindFunction(mId),
      unbindFunction: getUnbindFunction(mId),
    });
  }

  // Prepares arguments required for resolution and
  // delegates resolution to _middleware if available
  // otherwise it delegates resolution to _planAndResolve
  private _get<T>(
    avoidConstraints: boolean,
    isMultiInject: boolean,
    targetType: TargetType,
    serviceIdentifier: ServiceIdentifier<any>,
    key?: string | number | symbol,
    value?: any
  ): T | T[] {
    let result: (T | T[]) | null = null;

    const defaultArgs: NextArgs = {
      avoidConstraints,
      contextInterceptor: (context: Context) => context,
      isMultiInject,
      key,
      serviceIdentifier,
      targetType,
      value,
    };

    if (this._middleware) {
      result = this._middleware(defaultArgs);
      if (result === undefined || result === null) {
        throw new Error(INVALID_MIDDLEWARE_RETURN);
      }
    } else {
      result = this._planAndResolve<T>()(defaultArgs);
    }

    return result;
  }

  // Planner creates a plan and Resolver resolves a plan
  // one of the jobs of the Container is to links the Planner
  // with the Resolver and that is what this function is about
  private _planAndResolve<T>(): (args: NextArgs) => T | T[] {
    return (args: NextArgs) => {
      // create a plan
      let context = plan(
        this._metadataReader,
        this,
        args.isMultiInject,
        args.targetType,
        args.serviceIdentifier,
        args.key,
        args.value,
        args.avoidConstraints
      );

      // apply context interceptor
      context = args.contextInterceptor(context);

      // resolve plan
      const result = resolve<T>(context);
      return result;
    };
  }
}

export { Container };
