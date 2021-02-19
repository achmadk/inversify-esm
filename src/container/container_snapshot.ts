import {
  ContainerSnapshot as ContainerSnapshotInterface,
  Binding,
  Next,
  Lookup,
} from '../interfaces/interfaces';

export class ContainerSnapshot implements ContainerSnapshotInterface {
  public bindings!: Lookup<Binding<any>>;
  public middleware!: Next | null;

  public static of(bindings: Lookup<Binding<any>>, middleware: Next | null) {
    const snapshot = new ContainerSnapshot();
    snapshot.bindings = bindings;
    snapshot.middleware = middleware;
    return snapshot;
  }
}
