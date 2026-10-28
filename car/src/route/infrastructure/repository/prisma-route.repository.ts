import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IRouteRepository,
  RouteFilterParams,
  RouteListQueryResult,
  RouteDailyActivity,
} from '../../domain/repository/route.repository.interface';
import { Route } from '../../domain/entity/route.entity';
import { RouteStatus } from '../../domain/value-object/route-status.enum';
import { PrismaService } from '../../../prisma/prisma.service';
import { RouteMapper } from '../mapper/route.mapper';
import { vietnamDayBounds, vietnamToday } from '../../../trip/domain/value-object/vietnam-day';

@Injectable()
export class PrismaRouteRepository implements IRouteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOperatorIdByUserId(userId: string): Promise<string | null> {
    const operator = await this.prisma.operator.findFirst({
      where: { userId },
    });

    return operator ? operator.id : null;
  }

  async findById(id: string): Promise<Route | null> {
    const found = await this.prisma.route.findUnique({
      where: { id, deletedAt: null },
      include: {
        stops: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return found ? RouteMapper.toDomain(found) : null;
  }

  async save(route: Route): Promise<Route> {
    if (route.id) {
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM routes WHERE id = ${route.id!} FOR UPDATE`;
        if (!(await tx.route.findFirst({ where: { id: route.id!, deletedAt: null } })))
          throw new NotFoundException('Tuyến đường đã bị xóa');
        await tx.routeStop.deleteMany({ where: { routeId: route.id } });
        return tx.route.update({
          where: { id: route.id },
          data: {
            origin: route.origin,
            destination: route.destination,
            status: route.status as any,
            stops: {
              create: route.stops.map((stop) => ({
                name: stop.name,
                order: stop.order,
                address: stop.address || null,
                province: stop.province || null,
              })),
            },
          },
          include: {
            stops: {
              orderBy: { order: 'asc' },
            },
          },
        });
      });

      return RouteMapper.toDomain(updated);
    }

    const created = await this.prisma.route.create({
      data: {
        operatorId: route.operatorId,
        origin: route.origin,
        destination: route.destination,
        status: route.status as any,
        stops: {
          create: route.stops.map((stop) => ({
            name: stop.name,
            order: stop.order,
            address: stop.address || null,
            province: stop.province || null,
          })),
        },
      },
      include: {
        stops: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return RouteMapper.toDomain(created);
  }

  async updateStatus(id: string, status: RouteStatus): Promise<Route> {
    const updated = await this.prisma.route.update({
      where: { id, deletedAt: null },
      data: {
        status: status as any,
      },
      include: {
        stops: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return RouteMapper.toDomain(updated);
  }

  async findManyByOperatorId(params: RouteFilterParams): Promise<RouteListQueryResult> {
    const {
      operatorId,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = params;

    const where: Prisma.RouteWhereInput = {
      operatorId,
      deletedAt: null,
    };

    if (status) {
      where.status = status as any;
    }

    if (search && search.trim() !== '') {
      const trimmedSearch = search.trim();
      where.OR = [
        { origin: { contains: trimmedSearch, mode: 'insensitive' } },
        { destination: { contains: trimmedSearch, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [routes, total] = await Promise.all([
      this.prisma.route.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          stops: {
            orderBy: { order: 'asc' },
          },
        },
      }),
      this.prisma.route.count({ where }),
    ]);

    const date = vietnamToday();
    const { start, end } = vietnamDayBounds(date);
    const now = new Date();
    const routeIds = routes.map((route) => route.id);
    const dailyActivity: Record<string, RouteDailyActivity> = Object.fromEntries(
      routeIds.map((id) => [id, { date, totalTrips: 0, onSaleTrips: 0 }]),
    );
    if (routeIds.length) {
      const [scheduled, onSale] = await Promise.all([
        this.prisma.trip.groupBy({
          by: ['routeId'],
          where: { routeId: { in: routeIds }, departureTime: { gte: start, lte: end } },
          _count: { _all: true },
        }),
        this.prisma.trip.groupBy({
          by: ['routeId'],
          where: {
            routeId: { in: routeIds }, status: 'ON_SALE',
            departureTime: { gte: start, gt: now, lte: end },
            cancellation: { is: null },
          },
          _count: { _all: true },
        }),
      ]);
      for (const row of scheduled) dailyActivity[row.routeId].totalTrips = row._count._all;
      for (const row of onSale) dailyActivity[row.routeId].onSaleTrips = row._count._all;
    }

    return { routes: routes.map(RouteMapper.toDomain), total, dailyActivity };
  }

  async getDistinctLocations(): Promise<string[]> {
    const routes = await this.prisma.route.findMany({
      where: {
        OR: [
          { status: 'ACTIVE' },
          { trips: { some: { status: 'ON_SALE', departureTime: { gt: new Date() }, operator: { status: 'ACTIVE' } } } },
        ],
      },
      select: {
        origin: true,
        destination: true,
      },
    });

    const locationSet = new Set<string>();

    for (const route of routes) {
      if (route.origin && route.origin.trim()) {
        locationSet.add(route.origin.trim());
      }
      if (route.destination && route.destination.trim()) {
        locationSet.add(route.destination.trim());
      }
    }

    return Array.from(locationSet).sort((a, b) => a.localeCompare(b, 'vi'));
  }
}
