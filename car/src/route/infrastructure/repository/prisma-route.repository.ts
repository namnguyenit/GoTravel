import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IRouteRepository,
  RouteFilterParams,
  RouteListQueryResult,
} from '../../domain/repository/route.repository.interface';
import { Route } from '../../domain/entity/route.entity';
import { RouteStatus } from '../../domain/value-object/route-status.enum';
import { PrismaService } from '../../../prisma/prisma.service';
import { RouteMapper } from '../mapper/route.mapper';

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
      where: { id },
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
      where: { id },
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

    return {
      routes: routes.map(RouteMapper.toDomain),
      total,
    };
  }
}
