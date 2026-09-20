import { RouteStop as PrismaRouteStopModel } from '@prisma/client';
import { RouteStop } from '../../domain/entity/route-stop.entity';

export class RouteStopMapper {
  public static toDomain(model: PrismaRouteStopModel): RouteStop {
    return RouteStop.reconstruct({
      id: model.id,
      routeId: model.routeId,
      name: model.name,
      order: model.order,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }

  public static toPersistence(entity: RouteStop, routeId?: string) {
    return {
      id: entity.id,
      routeId: entity.routeId || routeId,
      name: entity.name,
      order: entity.order,
    };
  }
}
