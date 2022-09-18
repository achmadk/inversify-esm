import {
  ContainerSnapshot as ContainerSnapshotInterface,
  Binding,
  Next,
  Lookup,
  BindingDeactivation,
  ModuleActivationStoreInterface,
  BindingActivation,
} from '../interfaces/interfaces';

export class ContainerSnapshot implements ContainerSnapshotInterface {
  public bindings!: Lookup<Binding<any>>;
  public activations!: Lookup<BindingActivation<unknown>>;
  public deactivations!: Lookup<BindingDeactivation<unknown>>;
  public middleware!: Next | null;
  public moduleActivationStore!: ModuleActivationStoreInterface;

  public static of(
    bindings: Lookup<Binding<any>>,
    middleware: Next | null,
    activations: Lookup<BindingActivation<unknown>>,
    deactivations: Lookup<BindingDeactivation<unknown>>,
    moduleActivationStore: ModuleActivationStoreInterface
  ) {
    const snapshot = new ContainerSnapshot();
    snapshot.bindings = bindings;
    snapshot.middleware = middleware;
    snapshot.deactivations = deactivations;
    snapshot.activations = activations;
    snapshot.moduleActivationStore = moduleActivationStore;
    return snapshot;
  }
}
