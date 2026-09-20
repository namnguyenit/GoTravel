import { Trip as PrismaTripModel, TripStatus as PrismaTripStatus } from '@prisma/client';
import { Trip } from '../../domain/entity/trip.entity';
import { TripStatus } from '../../domain/value-object/trip-status.enum';

export class TripMapper {
  public static toDomain(model: PrismaTripModel): Trip {
    return Trip.reconstruct({
      id: model.id,
      operatorId: model.operatorId,
      routeId: model.routeId,
      carId: model.carId,
      departureTime: model.departureTime,
      arrivalTime: model.arrivalTime,
      pricePerSeat: model.pricePerSeat,
      status: model.status as unknown as TripStatus,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }

  public static toPersistence(entity: Trip) {
    return {
      id: entity.id,
      operatorId: entity.operatorId,
      routeId: entity.routeId,
      carId: entity.carId,
      departureTime: entity.departureTime,
      arrivalTime: entity.arrivalTime,
      pricePerSeat: entity.pricePerSeat,
      status: entity.status as unknown as PrismaTripStatus,
    };
  }
}
