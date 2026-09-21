import { GetRouteLocationsOutput } from '../dto/get-route-locations.output';

export interface IGetRouteLocationsUseCase {
  execute(): Promise<GetRouteLocationsOutput>;
}
