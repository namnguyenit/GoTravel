import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IRouteRepository } from '../../domain/repository/route.repository.interface';

@Injectable()
export class GetRouteDetailUseCase {
  constructor(@Inject('IRouteRepository') private readonly routes: IRouteRepository) {}

  async execute(routeId: string, userId: string) {
    const operatorId = await this.routes.findOperatorIdByUserId(userId);
    const route = await this.routes.findById(routeId);
    if (!operatorId || !route || route.operatorId !== operatorId) {
      throw new NotFoundException('Không tìm thấy tuyến thuộc nhà xe của bạn');
    }
    return route;
  }
}
