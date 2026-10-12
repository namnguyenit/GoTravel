import { Inject, Injectable } from '@nestjs/common';
import type {
  IUpdateRouteUseCase,
  UpdateRouteInput,
} from '../port/update-route.usecase.interface';
import { Route } from '../../domain/entity/route.entity';
@Injectable()
export class UpdateRouteUseCase implements IUpdateRouteUseCase {
  constructor(
    @Inject('RouteManagementPort')
    private readonly management: IUpdateRouteUseCase,
  ) {}
  execute(input: UpdateRouteInput): Promise<Route> {
    return this.management.execute(input);
  }
}
