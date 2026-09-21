import { Injectable, Inject } from '@nestjs/common';
import { IGetRouteLocationsUseCase } from '../port/get-route-locations.usecase.interface';
import { GetRouteLocationsOutput } from '../dto/get-route-locations.output';
import type { IRouteRepository } from '../../domain/repository/route.repository.interface';

@Injectable()
export class GetRouteLocationsUseCase implements IGetRouteLocationsUseCase {
  constructor(
    @Inject('IRouteRepository')
    private readonly routeRepository: IRouteRepository,
  ) {}

  async execute(): Promise<GetRouteLocationsOutput> {
    const locations = await this.routeRepository.getDistinctLocations();
    return { locations };
  }
}
