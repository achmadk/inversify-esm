import {
  INVALID_TO_SELF_VALUE,
  INVALID_FUNCTION_BINDING,
} from '../constants/error_msgs';
import { BindingTypeEnum } from '../constants/literal_types';
import {
  Abstract,
  BindingToSyntax as IBindingToSyntax,
  BindingInWhenOnSyntax as IBindingInWhenOnSyntax,
  BindingWhenOnSyntax as IBindingWhenOnSyntax,
  Binding,
  Context,
  FactoryCreator,
  Newable,
  ProviderCreator,
  ServiceIdentifier,
} from '../interfaces/interfaces';
import { BindingInWhenOnSyntax } from './binding_in_when_on_syntax';
import { BindingWhenOnSyntax } from './binding_when_on_syntax';

export class BindingToSyntax<T> implements IBindingToSyntax<T> {
  private _binding: Binding<T>;

  public constructor(binding: Binding<T>) {
    this._binding = binding;
  }

  public to(constructor: new (...args: any[]) => T): BindingInWhenOnSyntax<T> {
    this._binding.type = BindingTypeEnum.Instance;
    this._binding.implementationType = constructor;
    return new BindingInWhenOnSyntax<T>(this._binding);
  }

  public toSelf(): IBindingInWhenOnSyntax<T> {
    if (typeof this._binding.serviceIdentifier !== 'function') {
      throw new Error(`${INVALID_TO_SELF_VALUE}`);
    }
    const self: any = this._binding.serviceIdentifier;
    return this.to(self);
  }

  public toConstantValue(value: T): IBindingWhenOnSyntax<T> {
    this._binding.type = BindingTypeEnum.ConstantValue;
    this._binding.cache = value;
    this._binding.dynamicValue = null;
    this._binding.implementationType = null;
    return new BindingWhenOnSyntax<T>(this._binding);
  }

  public toDynamicValue(
    func: (context: Context) => T
  ): IBindingInWhenOnSyntax<T> {
    this._binding.type = BindingTypeEnum.DynamicValue;
    this._binding.cache = null;
    this._binding.dynamicValue = func;
    this._binding.implementationType = null;
    return new BindingInWhenOnSyntax<T>(this._binding);
  }

  public toConstructor<T2>(constructor: Newable<T2>): IBindingWhenOnSyntax<T> {
    this._binding.type = BindingTypeEnum.Constructor;
    this._binding.implementationType = constructor as any;
    return new BindingWhenOnSyntax<T>(this._binding);
  }

  public toFactory<T2>(factory: FactoryCreator<T2>): IBindingWhenOnSyntax<T> {
    this._binding.type = BindingTypeEnum.Factory;
    this._binding.factory = factory;
    return new BindingWhenOnSyntax<T>(this._binding);
  }

  public toFunction(func: T): IBindingWhenOnSyntax<T> {
    // toFunction is an alias of toConstantValue
    if (typeof func !== 'function') {
      throw new Error(INVALID_FUNCTION_BINDING);
    }
    const bindingWhenOnSyntax = this.toConstantValue(func);
    this._binding.type = BindingTypeEnum.Function;
    return bindingWhenOnSyntax;
  }

  public toAutoFactory<T2>(
    serviceIdentifier: ServiceIdentifier<T2>
  ): IBindingWhenOnSyntax<T> {
    this._binding.type = BindingTypeEnum.Factory;
    this._binding.factory = (context) => {
      const autofactory = () => context.container.get<T2>(serviceIdentifier);
      return autofactory;
    };
    return new BindingWhenOnSyntax<T>(this._binding);
  }

  public toProvider<T2>(
    provider: ProviderCreator<T2>
  ): IBindingWhenOnSyntax<T> {
    this._binding.type = BindingTypeEnum.Provider;
    this._binding.provider = provider;
    return new BindingWhenOnSyntax<T>(this._binding);
  }

  public toService(service: string | symbol | Newable<T> | Abstract<T>): void {
    this.toDynamicValue((context) => context.container.get<T>(service));
  }
}
