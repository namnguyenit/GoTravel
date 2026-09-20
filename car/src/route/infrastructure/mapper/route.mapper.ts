import { Route as PrismaRouteModel, RouteStop as PrismaRouteStopModel } from '@prisma/client';
import { Route } from '../../domain/entity/route.entity';
import { RouteStatus } from '../../domain/value-object/route-status.enum';
import { RouteStopMapper } from './route-stop.mapper';

export type PrismaRouteWithStops = PrismaRouteModel & {
  stops: PrismaRouteStopModel[];
};

export class RouteMapper {
  public static toDomain(model: PrismaRouteWithStops): Route {
    const stops = (model.stops || []).map(RouteStopMapper.toDomain);
    return Route.reconstruct({
      id: model.id,
      operatorId: model.operatorId,
      origin: model.origin,
      destination: model.destination,
      status: model.status as RouteStatus,
      stops,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }

  public static toPersistence(entity: Route) {
    return {
      id: entity.id,
      operatorId: entity.operatorId,
      origin: entity.origin,
      destination: entity.destination,
      status: entity.status,
      stops: entity.stops.map((stop) => RouteStopMapper.toPersistence(stop, entity.id)),
    };
  }
}
