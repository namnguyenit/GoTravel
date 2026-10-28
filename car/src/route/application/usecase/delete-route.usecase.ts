import { Inject, Injectable } from '@nestjs/common';
import type {
  IDeleteRouteUseCase,
  DeleteRouteInput,
  DeleteRouteOutput,
} from '../port/delete-route.usecase.interface';
import { PrismaUpdateRouteManagement } from '../../infrastructure/repository/prisma-update-route.management';

@Injectable()
export class DeleteRouteUseCase implements IDeleteRouteUseCase {
  constructor(
    @Inject('RouteManagementPort')
    private readonly management: PrismaUpdateRouteManagement,
  ) {}

  execute(input: DeleteRouteInput): Promise<DeleteRouteOutput> {
    return this.management.deleteRoute(input);
  }
}
