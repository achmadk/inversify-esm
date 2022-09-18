import {
  BindingOnSyntax as IBindingOnSyntax,
  Binding,
  Context,
  BindingWhenSyntax as IBindingWhenSyntax,
  BindingDeactivation,
} from '../interfaces/interfaces';
import { BindingWhenSyntax } from './binding_when_syntax';

export class BindingOnSyntax<T> implements IBindingOnSyntax<T> {
  private _binding: Binding<T>;

  public constructor(binding: Binding<T>) {
    this._binding = binding;
  }

  public onActivation(
    handler: (context: Context, injectable: T) => T
  ): IBindingWhenSyntax<T> {
    this._binding.onActivation = handler;
    return new BindingWhenSyntax<T>(this._binding);
  }

  public onDeactivation(
    handler: BindingDeactivation<T>
  ): IBindingWhenSyntax<T> {
    this._binding.onDeactivation = handler;
    return new BindingWhenSyntax<T>(this._binding);
  }
}
