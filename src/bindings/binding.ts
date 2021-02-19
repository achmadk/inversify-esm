import { BindingScopeEnum, BindingTypeEnum } from '../constants/literal_types';
import {
  Binding as BindingInterface,
  ServiceIdentifier,
  Newable,
  Context,
  BindingScope,
  BindingType,
  FactoryCreator,
  ProviderCreator,
} from '../interfaces/interfaces';
import { id } from '../utils/id';

export class Binding<T> implements BindingInterface<T> {
  public id: number;
  public moduleId!: string;

  /**
   * Determines weather the bindings has been already activated
   * The activation action takes place when an instance is resolved
   * If the scope is singleton it only happens once
   */
  public activated: boolean;

  /**
   * A runtime identifier because at runtime we don't have interfaces
   */
  public serviceIdentifier: ServiceIdentifier<T>;

  /**
   * The constructor of a class which must implement T
   */
  public implementationType: Newable<T> | null;

  /**
   * Cache used to allow singleton scope and BindingType.ConstantValue bindings
   */
  public cache: T | null;

  /**
   * Cache used to allow BindingType.DynamicValue bindings
   */
  public dynamicValue: ((context: Context) => T) | null;

  /**
   * The scope mode to be used
   */
  public scope: BindingScope;

  /**
   * The kind of binding
   */
  public type: BindingType;

  /**
   * A factory method used in BindingType.Factory bindings
   */
  public factory: FactoryCreator<T> | null;

  /**
   * An async factory method used in BindingType.Provider bindings
   */
  public provider: ProviderCreator<T> | null;

  /**
   * A constraint used to limit the contexts in which this binding is applicable
   */
  // @ts-ignore
  public constraint: (request: Request | null) => boolean;

  /**
   * On activation handler (invoked just before an instance is added to cache and injected)
   */
  public onActivation: ((context: Context, injectable: T) => T) | null;

  public constructor(
    serviceIdentifier: ServiceIdentifier<T>,
    scope: BindingScope
  ) {
    this.id = id();
    this.activated = false;
    this.serviceIdentifier = serviceIdentifier;
    this.scope = scope;
    this.type = BindingTypeEnum.Invalid;
    this.constraint = (_request: Request | null) => true;
    this.implementationType = null;
    this.cache = null;
    this.factory = null;
    this.provider = null;
    this.onActivation = null;
    this.dynamicValue = null;
  }

  // @ts-ignore
  public clone(): Binding<T> {
    const clone = new Binding(this.serviceIdentifier, this.scope);
    clone.activated =
      clone.scope === BindingScopeEnum.Singleton ? this.activated : false;
    clone.implementationType = this.implementationType;
    clone.dynamicValue = this.dynamicValue;
    clone.scope = this.scope;
    clone.type = this.type;
    clone.factory = this.factory;
    clone.provider = this.provider;
    clone.constraint = this.constraint;
    clone.onActivation = this.onActivation;
    clone.cache = this.cache;
    return clone;
  }
}
