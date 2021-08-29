import {
  ContainerInterface,
  ServiceIdentifier,
} from '../interfaces/interfaces';

export const multiBindToService =
  (container: ContainerInterface) =>
  (service: ServiceIdentifier<any>) =>
  (...types: ServiceIdentifier<any>[]) =>
    types.forEach((t) => container.bind(t).toService(service));
