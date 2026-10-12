import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import type {
  IUpdateRouteUseCase,
  UpdateRouteInput,
} from '../../application/port/update-route.usecase.interface';
import type { IRouteRepository } from '../../domain/repository/route.repository.interface';
import { Route } from '../../domain/entity/route.entity';
import { RouteStop } from '../../domain/entity/route-stop.entity';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PrismaUpdateRouteManagement implements IUpdateRouteUseCase {
  constructor(
    @Inject('IRouteRepository')
    private readonly routeRepository: IRouteRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: UpdateRouteInput): Promise<Route> {
    const { routeId, userId, dto } = input;
    if (!routeId || !routeId.trim())
      throw new BadRequestException('Mã tuyến đường không hợp lệ');

    const operatorId =
      await this.routeRepository.findOperatorIdByUserId(userId);
    if (!operatorId) {
      throw new ForbiddenException('Tài khoản chưa được liên kết với nhà xe');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM routes WHERE id = ${routeId} FOR UPDATE`;

      const existing = await tx.route.findUnique({
        where: { id: routeId },
        include: { stops: { orderBy: { order: 'asc' } } },
      });
      if (!existing || existing.operatorId !== operatorId) {
        throw new NotFoundException('Không tìm thấy tuyến đường');
      }

      // Safe draft rule: prevent modifying routes with published or completed trips
      const activeTripsCount = await tx.trip.count({
        where: {
          routeId,
          status: {
            in: [
              'PUBLISHING',
              'ON_SALE',
              'STOP_SALE',
              'SCHEDULED',
              'DEPARTED',
              'COMPLETED',
            ],
          },
        },
      });
      const legacyTickets = await tx.ticket.count({
        where: { trip: { routeId } },
      });
      if (activeTripsCount > 0 || legacyTickets > 0) {
        throw new ConflictException(
          'Không thể sửa tuyến đường đã có chuyến xe mở bán hoặc hoàn tất. Vui lòng tạo tuyến mới.',
        );
      }

      const nextOrigin = dto.origin ? dto.origin.trim() : existing.origin;
      const nextDestination = dto.destination
        ? dto.destination.trim()
        : existing.destination;
      if (nextOrigin.toLowerCase() === nextDestination.toLowerCase()) {
        throw new BadRequestException(
          'Điểm xuất phát và điểm đến không được trùng nhau.',
        );
      }

      if (dto.stops) {
        if (dto.stops.length < 2) {
          throw new BadRequestException(
            'Tuyến đường phải có ít nhất 2 điểm dừng.',
          );
        }

        const orders = new Set<number>();
        for (const stop of dto.stops) {
          if (orders.has(stop.order)) {
            throw new BadRequestException(
              `Thứ tự điểm dừng (${stop.order}) bị trùng lặp.`,
            );
          }
          orders.add(stop.order);

          if (stop.operatorStopId) {
            const masterStop = await (tx as any).operatorStop.findUnique({
              where: { id: stop.operatorStopId },
            });
            if (
              !masterStop ||
              masterStop.operatorId !== operatorId ||
              !masterStop.active
            ) {
              throw new BadRequestException(
                `Điểm dừng danh mục ${stop.operatorStopId} không hợp lệ hoặc đã lưu trữ.`,
              );
            }
            if (!stop.address) stop.address = masterStop.address;
            if (!stop.province) stop.province = masterStop.province;
          }
        }

        await tx.trip.updateMany({
          where: { routeId, status: 'DRAFT' },
          data: { stopOverrides: Prisma.DbNull },
        });
        // Replace stops safely since no published trips/tickets exist
        await tx.routeStop.deleteMany({ where: { routeId } });
        await (tx.routeStop as any).createMany({
          data: dto.stops.map((s) => ({
            routeId,
            operatorStopId: s.operatorStopId ?? null,
            name: s.name.trim(),
            address: s.address?.trim() ?? null,
            province: s.province?.trim() ?? null,
            order: s.order,
          })),
        });
      }

      const updated = await tx.route.update({
        where: { id: routeId },
        data: {
          origin: nextOrigin,
          destination: nextDestination,
        },
        include: { stops: { orderBy: { order: 'asc' } } },
      });

      return Route.reconstruct({
        id: updated.id,
        operatorId: updated.operatorId,
        origin: updated.origin,
        destination: updated.destination,
        status: updated.status as any,
        stops: updated.stops.map((s) =>
          RouteStop.reconstruct({
            id: s.id,
            routeId: s.routeId,
            name: s.name,
            order: s.order,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          }),
        ),
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      });
    });
  }
}
