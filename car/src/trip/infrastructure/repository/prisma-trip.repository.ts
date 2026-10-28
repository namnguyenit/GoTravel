import { resolveProvince } from '../../domain/value-object/province';
import { vietnamDayBounds } from '../../domain/value-object/vietnam-day';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
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

    if (!route || route.deletedAt) {
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
        status: {
          in: [
            'DRAFT',
            'PUBLISHING',
            'ON_SALE',
            'STOP_SALE',
            'SCHEDULED',
            'DEPARTED',
          ],
        },
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
        await tx.$queryRaw`SELECT id FROM trips WHERE id = ${raw.id} FOR UPDATE`;
        const current = await tx.trip.findUniqueOrThrow({
          where: { id: raw.id },
        });
        const domain = TripMapper.toDomain(current);
        domain.changeStatus(
          raw.status as import('../../domain/value-object/trip-status.enum').TripStatus,
        );
        const updated = await tx.trip.update({
          where: { id: raw.id },
          data: { status: raw.status, inventorySyncVersion: { increment: 1 } },
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

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM cars WHERE id=${raw.carId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM operators WHERE id=${raw.operatorId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM routes WHERE id=${raw.routeId} FOR UPDATE`;
      const car = await tx.car.findUnique({ where: { id: raw.carId } });
      const route = await tx.route.findUnique({ where: { id: raw.routeId } });
      const operator = await tx.operator.findUnique({
        where: { id: raw.operatorId },
      });
      if (
        !car ||
        !route ||
        !operator ||
        car.operatorId !== raw.operatorId ||
        route.operatorId !== raw.operatorId ||
        car.status !== 'ACTIVE' ||
        car.deletedAt !== null ||
        route.status !== 'ACTIVE' ||
        route.deletedAt !== null ||
        operator.status !== 'ACTIVE'
      )
        throw new BadRequestException(
          'Xe, tuyến hoặc nhà xe không còn hoạt động',
        );
      if (
        raw.departureTime <= new Date() ||
        (await tx.trip.findFirst({
          where: {
            carId: raw.carId,
            status: { not: 'CANCELLED' },
            departureTime: { lt: raw.arrivalTime },
            arrivalTime: { gt: raw.departureTime },
          },
        }))
      )
        throw new ConflictException(
          'Giờ khởi hành không hợp lệ hoặc xe bị trùng lịch',
        );
      return tx.trip.create({
        data: {
          operatorId: raw.operatorId,
          routeId: raw.routeId,
          carId: raw.carId,
          departureTime: raw.departureTime,
          arrivalTime: raw.arrivalTime,
          pricePerSeat: raw.pricePerSeat,
          priceVnd: new Prisma.Decimal(raw.pricePerSeat),
          searchPriceVnd: new Prisma.Decimal(raw.pricePerSeat),
          status: raw.status,
        },
      });
    });

    return TripMapper.toDomain(created);
  }

  async findManyByOperatorId(
    params: TripFilterParams,
  ): Promise<TripListQueryResult> {
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
      const { start: startOfDay, end: endOfDay } =
        vietnamDayBounds(departureDate);
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
    const dayScope: Prisma.TripWhereInput = {
      operatorId,
      departureTime: where.departureTime,
    };
    const now = new Date();

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
      this.prisma.trip.count({ where: dayScope }),
      this.prisma.trip.count({
        where: {
          ...dayScope,
          AND: [{ departureTime: { gt: now } }],
          status: {
            in: ['DRAFT', 'PUBLISHING', 'ON_SALE', 'STOP_SALE', 'SCHEDULED'],
          },
        },
      }),
      this.prisma.trip.count({
        where: {
          ...dayScope,
          OR: [
            { status: 'DEPARTED' },
            { status: 'STOP_SALE', AND: [{ departureTime: { lte: now } }] },
          ],
        },
      }),
      this.prisma.trip.count({ where: { ...dayScope, status: 'COMPLETED' } }),
      this.prisma.trip.count({ where: { ...dayScope, status: 'CANCELLED' } }),
    ]);

    return {
      trips: tripModels.map((model) => ({
        trip: TripMapper.toDomain(model),
        inventoryInitialized: Boolean(model.offerListingId),
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
        bookedSeats: 0,
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

    const originRegion = resolveProvince(params.originRegion || origin);
    const destinationRegion = resolveProvince(params.destinationRegion || destination);
    let routeIds = params.activeRouteIds ?? [];
    // Unknown explicit region must not turn into a global trip suggestion.
    if ((params.originRegion && !originRegion) || (params.destinationRegion && !destinationRegion)
      || (originRegion && destinationRegion && originRegion === destinationRegion)) routeIds = [];
    else if (originRegion || destinationRegion) {
      const routes = await this.prisma.route.findMany({
        where: { id: { in: routeIds }, deletedAt: null, status: 'ACTIVE' },
        select: { id: true, origin: true, destination: true,
          stops: { orderBy: { order: 'asc' }, select: { province: true } } },
      });
      routeIds = routes.filter(route => {
        const from = resolveProvince(route.origin) || resolveProvince(route.stops[0]?.province);
        const to = resolveProvince(route.destination) || resolveProvince(route.stops.at(-1)?.province);
        return (!originRegion || from === originRegion) && (!destinationRegion || to === destinationRegion);
      }).map(route => route.id);
    }
    const day = departureDate ? vietnamDayBounds(departureDate) : null;
    const now = new Date(Date.now() + 15 * 60_000);

    const where: Prisma.TripWhereInput = {
      status: 'ON_SALE',
      inventorySyncVersion: {
        equals: this.prisma.trip.fields.inventorySyncedVersion,
      },
      operator: { status: 'ACTIVE' },
      departureTime: {
        gte: day && day.start > now ? day.start : now,
        ...(day ? { lte: day.end } : {}),
      },
      route: {
        id: { in: routeIds },
        ...(origin && !originRegion
          ? { origin: { contains: origin, mode: 'insensitive' as const } }
          : {}),
        ...(destination && !destinationRegion
          ? {
              destination: {
                contains: destination,
                mode: 'insensitive' as const,
              },
            }
          : {}),
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
      where.searchPriceVnd = {};
      if (minPrice !== undefined) {
        where.searchPriceVnd.gte = new Prisma.Decimal(minPrice);
      }
      if (maxPrice !== undefined) {
        where.searchPriceVnd.lte = new Prisma.Decimal(maxPrice);
      }
    }

    if (operatorId) {
      where.operatorId = operatorId;
    }

    const intervals = params.departureRanges ?? [];
    if (intervals.length)
      where.AND = [
        {
          OR: intervals.map((range) => ({
            departureTime: { gte: range.start, lt: range.end },
          })),
        },
      ];

    const minuteRanges = params.minuteRanges ?? [];
    if (minuteRanges.length) {
      const clock = Prisma.sql`(extract(hour from (departure_time + interval '7 hours')) * 60 + extract(minute from (departure_time + interval '7 hours')))`;
      const conditions = minuteRanges.map(
        (range) =>
          Prisma.sql`(${clock} >= ${range.start} and ${clock} < ${range.end})`,
      );
      const timed = await this.prisma.$queryRaw<
        Array<{ id: string }>
      >(Prisma.sql`
        select id from trips where status='ON_SALE' and departure_time>=${now}
        and (${Prisma.join(conditions, ' OR ')})
      `);
      where.id = { in: timed.map((row) => row.id) };
    }
    const skip = (page - 1) * limit;

    const [tripModels, total] = await Promise.all([
      this.prisma.trip.findMany({
        where,
        orderBy: [
          {
            [sortBy === 'pricePerSeat' ? 'searchPriceVnd' : sortBy]: sortOrder,
          },
          { id: 'asc' },
        ],
        skip,
        take: limit,
        include: {
          operator: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
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
        },
      }),
      this.prisma.trip.count({ where }),
    ]);

    const trips: CustomerTripItem[] = tripModels.map((item) => {
      const bookedSeats = 0; // Replaced with Inventory availability by the use case.
      const totalSeats = item.car.totalSeats;
      const availableSeats = Math.max(0, totalSeats - bookedSeats);
      const isSoldOut = availableSeats === 0;

      return {
        id: item.id,
        departureTime: item.departureTime,
        arrivalTime: item.arrivalTime,
        fromPriceVnd: (
          item.searchPriceVnd ??
          item.priceVnd ??
          item.pricePerSeat
        ).toString(),
        pricePerSeat: Number.isSafeInteger(
          Number(item.searchPriceVnd ?? item.priceVnd ?? item.pricePerSeat),
        )
          ? Number(item.searchPriceVnd ?? item.priceVnd ?? item.pricePerSeat)
          : null,
        status: item.status as any,
        operator: {
          id: item.operator.id,
          logoUrl:
            item.operator.logoUrl ??
            (item as any).saleSnapshot?.operatorProfile?.logoUrl ??
            null,
          name:
            (item as any).saleSnapshot?.operatorProfile?.name ??
            item.operator.name,
        },
        route: {
          id: item.route.id,
          origin: (item as any).saleSnapshot?.origin ?? item.route.origin,
          destination:
            (item as any).saleSnapshot?.destination ?? item.route.destination,
          stops: (
            ((item as any).saleSnapshot?.stops ?? item.route.stops) ||
            []
          ).map((stop: any) => ({
            id: stop.id,
            name: stop.name,
            order: stop.order,
          })),
        },
        car: {
          id: item.car.id,
          name: (item as any).saleSnapshot?.vehicle?.name ?? item.car.name,
          licensePlate:
            (item as any).saleSnapshot?.vehicle?.licensePlate ??
            item.car.licensePlate,
          type: (item as any).saleSnapshot?.vehicle?.type ?? item.car.type,
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
