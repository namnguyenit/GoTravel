import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ITripRepository,
  TripFilterParams,
  TripListQueryResult,
  RouteRef,
  CarRef,
  CustomerTripSearchParams,
  CustomerTripSearchResult,
  CustomerTripItem,
} from '../../domain/repository/trip.repository.interface';
import { Trip } from '../../domain/entity/trip.entity';
import { PrismaService } from '../../../prisma/prisma.service';
import { TripMapper } from '../mapper/trip.mapper';

@Injectable()
export class PrismaTripRepository implements ITripRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOperatorIdByUserId(userId: string): Promise<string | null> {
    const operator = await this.prisma.operator.findFirst({
      where: { userId },
    });

    return operator ? operator.id : null;
  }

  async findRouteById(routeId: string): Promise<RouteRef | null> {
    const route = await this.prisma.route.findUnique({
      where: { id: routeId },
    });

    if (!route) {
      return null;
    }

    return {
      id: route.id,
      operatorId: route.operatorId,
      status: route.status,
      origin: route.origin,
      destination: route.destination,
    };
  }

  async findCarById(carId: string): Promise<CarRef | null> {
    const car = await this.prisma.car.findUnique({
      where: { id: carId },
    });

    if (!car) {
      return null;
    }

    return {
      id: car.id,
      operatorId: car.operatorId,
      status: car.status,
      name: car.name,
      licensePlate: car.licensePlate,
      type: car.type,
      totalSeats: car.totalSeats,
    };
  }

  async checkCarScheduleConflict(
    carId: string,
    departureTime: Date,
    arrivalTime: Date,
    excludeTripId?: string,
  ): Promise<boolean> {
    const count = await this.prisma.trip.count({
      where: {
        carId,
        id: excludeTripId ? { not: excludeTripId } : undefined,
        status: { in: ['SCHEDULED', 'DEPARTED'] },
        departureTime: { lt: arrivalTime },
        arrivalTime: { gt: departureTime },
      },
    });

    return count > 0;
  }

  async findById(id: string): Promise<Trip | null> {
    const model = await this.prisma.trip.findUnique({
      where: { id },
    });

    if (!model) {
      return null;
    }

    return TripMapper.toDomain(model);
  }

  async save(trip: Trip): Promise<Trip> {
    const raw = TripMapper.toPersistence(trip);

    if (raw.id) {
      const saved = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.trip.update({
          where: { id: raw.id },
          data: {
            departureTime: raw.departureTime,
            arrivalTime: raw.arrivalTime,
            pricePerSeat: raw.pricePerSeat,
            status: raw.status,
          },
        });

        // Nếu trạng thái cập nhật thành CANCELLED, tự động chuyển các vé đã đặt sang CANCELLED
        if (raw.status === 'CANCELLED') {
          await tx.ticket.updateMany({
            where: {
              tripId: raw.id,
              status: { in: ['BOOKED', 'PAID'] },
            },
            data: {
              status: 'CANCELLED',
            },
          });
        }

        return updated;
      });

      return TripMapper.toDomain(saved);
    }

    const created = await this.prisma.trip.create({
      data: {
        operatorId: raw.operatorId,
        routeId: raw.routeId,
        carId: raw.carId,
        departureTime: raw.departureTime,
        arrivalTime: raw.arrivalTime,
        pricePerSeat: raw.pricePerSeat,
        status: raw.status,
      },
    });

    return TripMapper.toDomain(created);
  }

  async findManyByOperatorId(params: TripFilterParams): Promise<TripListQueryResult> {
    const {
      operatorId,
      keyword,
      status,
      routeId,
      carId,
      departureDate,
      sortBy = 'departureTime',
      sortOrder = 'asc',
      page = 1,
      limit = 10,
    } = params;

    const where: Prisma.TripWhereInput = {
      operatorId,
    };

    if (status) {
      where.status = status as any;
    }

    if (routeId) {
      where.routeId = routeId;
    }

    if (carId) {
      where.carId = carId;
    }

    if (departureDate && departureDate.trim() !== '') {
      const startOfDay = new Date(`${departureDate}T00:00:00.000Z`);
      const endOfDay = new Date(`${departureDate}T23:59:59.999Z`);
      where.departureTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    if (keyword && keyword.trim() !== '') {
      const kw = keyword.trim();
      where.OR = [
        { route: { origin: { contains: kw, mode: 'insensitive' } } },
        { route: { destination: { contains: kw, mode: 'insensitive' } } },
        { car: { name: { contains: kw, mode: 'insensitive' } } },
        { car: { licensePlate: { contains: kw, mode: 'insensitive' } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [
      tripModels,
      totalCount,
      totalTrips,
      scheduledTrips,
      departedTrips,
      completedTrips,
      cancelledTrips,
    ] = await Promise.all([
      this.prisma.trip.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          route: true,
          car: true,
          tickets: {
            where: {
              status: { in: ['BOOKED', 'PAID'] },
            },
          },
        },
      }),
      this.prisma.trip.count({ where }),
      this.prisma.trip.count({ where: { operatorId } }),
      this.prisma.trip.count({ where: { operatorId, status: 'SCHEDULED' } }),
      this.prisma.trip.count({ where: { operatorId, status: 'DEPARTED' } }),
      this.prisma.trip.count({ where: { operatorId, status: 'COMPLETED' } }),
      this.prisma.trip.count({ where: { operatorId, status: 'CANCELLED' } }),
    ]);

    return {
      trips: tripModels.map((model) => ({
        trip: TripMapper.toDomain(model),
        route: {
          id: model.route.id,
          origin: model.route.origin,
          destination: model.route.destination,
        },
        car: {
          id: model.car.id,
          name: model.car.name,
          licensePlate: model.car.licensePlate,
          type: model.car.type,
          totalSeats: model.car.totalSeats,
        },
        bookedSeats: model.tickets ? model.tickets.length : 0,
      })),
      total: totalCount,
      kpi: {
        totalTrips,
        scheduledTrips,
        departedTrips,
        completedTrips,
        cancelledTrips,
      },
    };
  }

  async searchCustomerTrips(
    params: CustomerTripSearchParams,
  ): Promise<CustomerTripSearchResult> {
    const {
      origin,
      destination,
      departureDate,
      type,
      minPrice,
      maxPrice,
      operatorId,
      sortBy = 'departureTime',
      sortOrder = 'asc',
      page = 1,
      limit = 10,
    } = params;

    const startOfDay = new Date(`${departureDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${departureDate}T23:59:59.999Z`);
    const now = new Date();

    const where: Prisma.TripWhereInput = {
      status: 'SCHEDULED',
      departureTime: {
        gte: startOfDay > now ? startOfDay : now,
        lte: endOfDay,
      },
      route: {
        status: 'ACTIVE',
        origin: { contains: origin, mode: 'insensitive' },
        destination: { contains: destination, mode: 'insensitive' },
      },
      car: {
        status: 'ACTIVE',
      },
    };

    if (type) {
      where.car = {
        status: 'ACTIVE',
        type: type as any,
      };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.pricePerSeat = {};
      if (minPrice !== undefined) {
        where.pricePerSeat.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.pricePerSeat.lte = maxPrice;
      }
    }

    if (operatorId) {
      where.operatorId = operatorId;
    }

    const skip = (page - 1) * limit;

    const [tripModels, total] = await Promise.all([
      this.prisma.trip.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          operator: {
            select: {
              id: true,
              name: true,
            },
          },
          route: {
            include: {
              stops: {
                orderBy: { order: 'asc' },
              },
            },
          },
          car: true,
          tickets: {
            where: {
              status: { in: ['BOOKED', 'PAID'] },
            },
          },
        },
      }),
      this.prisma.trip.count({ where }),
    ]);

    const trips: CustomerTripItem[] = tripModels.map((item) => {
      const bookedSeats = item.tickets ? item.tickets.length : 0;
      const totalSeats = item.car.totalSeats;
      const availableSeats = Math.max(0, totalSeats - bookedSeats);
      const isSoldOut = availableSeats === 0;

      return {
        id: item.id,
        departureTime: item.departureTime,
        arrivalTime: item.arrivalTime,
        pricePerSeat: item.pricePerSeat,
        status: item.status as any,
        operator: {
          id: item.operator.id,
          name: item.operator.name,
        },
        route: {
          id: item.route.id,
          origin: item.route.origin,
          destination: item.route.destination,
          stops: (item.route.stops || []).map((stop) => ({
            id: stop.id,
            name: stop.name,
            order: stop.order,
          })),
        },
        car: {
          id: item.car.id,
          name: item.car.name,
          licensePlate: item.car.licensePlate,
          type: item.car.type,
          totalSeats: item.car.totalSeats,
        },
        seats: {
          totalSeats,
          bookedSeats,
          availableSeats,
          isSoldOut,
        },
      };
    });

    return {
      trips,
      total,
    };
  }
}
