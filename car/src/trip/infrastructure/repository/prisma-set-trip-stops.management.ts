import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  ISetTripStopsUseCase,
  SetTripStopsInput,
} from '../../application/port/set-trip-stops.usecase.interface';
import type { ITripRepository } from '../../domain/repository/trip.repository.interface';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PrismaSetTripStopsManagement implements ISetTripStopsUseCase {
  constructor(
    @Inject('ITripRepository')
    private readonly tripRepository: ITripRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: SetTripStopsInput): Promise<any> {
    const { tripId, userId, dto } = input;
    if (!tripId || !tripId.trim())
      throw new BadRequestException('Mã chuyến không hợp lệ');

    const operatorId = await this.tripRepository.findOperatorIdByUserId(userId);

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM trips WHERE id = ${tripId} FOR UPDATE`;

      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        include: {
          route: { include: { stops: { orderBy: { order: 'asc' } } } },
        },
      });

      if (!trip) throw new NotFoundException('Không tìm thấy chuyến');

      // Verify ownership or staff permission
      if (operatorId) {
        if (trip.operatorId !== operatorId)
          throw new ForbiddenException(
            'Không có quyền thao tác trên chuyến này',
          );
      } else {
        const staff = await (tx as any).operatorStaff.findFirst({
          where: { operatorId: trip.operatorId, userId, active: true },
        });
        if (!staff || !staff.canManageTrip) {
          throw new ForbiddenException(
            'Nhân viên không có quyền quản lý chuyến xe',
          );
        }
        if (
          staff.tripIds &&
          staff.tripIds.length > 0 &&
          !staff.tripIds.includes(tripId)
        ) {
          throw new ForbiddenException(
            'Chuyến xe nằm ngoài phạm vi được phân công',
          );
        }
      }

      // Invariant: Only DRAFT trips without saleSnapshot can be modified
      if (trip.status !== 'DRAFT' || (trip as any).saleSnapshot) {
        throw new ConflictException(
          'Chỉ có thể cài đặt điểm dừng cho chuyến xe ở trạng thái DRAFT',
        );
      }

      const validRouteStopIds = new Set(trip.route.stops.map((s) => s.id));
      const submittedStopIds = new Set<string>();
      const submittedOrders = new Set<number>();

      let prevScheduledAt: number | null = null;
      const departureMs = trip.departureTime.getTime();
      const arrivalMs = trip.arrivalTime.getTime();

      // Sort submitted stops by order to validate sequence
      const sortedStops = [...dto.stops].sort((a, b) => a.order - b.order);
      if (
        sortedStops.length !== trip.route.stops.length ||
        sortedStops.some((s, i) => s.routeStopId !== trip.route.stops[i].id)
      )
        throw new BadRequestException(
          'Cấu hình phải giữ đầy đủ điểm dừng và đúng chiều tuyến',
        );
      if (
        !sortedStops.some((s) => s.pickupAllowed ?? s.type !== 'DROPOFF') ||
        !sortedStops.some((s) => s.dropoffAllowed ?? s.type !== 'PICKUP')
      )
        throw new BadRequestException('Phải có điểm đón và điểm trả');

      if (
        !sortedStops.some(
          (pickup, i) =>
            (pickup.pickupAllowed ?? pickup.type !== 'DROPOFF') &&
            sortedStops
              .slice(i + 1)
              .some((drop) => drop.dropoffAllowed ?? drop.type !== 'PICKUP'),
        )
      )
        throw new BadRequestException(
          'Phải có ít nhất một cặp đón trước trả theo chiều tuyến',
        );
      for (let i = 0; i < sortedStops.length; i++) {
        const stop = sortedStops[i];

        if (!validRouteStopIds.has(stop.routeStopId)) {
          throw new BadRequestException(
            `Điểm dừng ${stop.routeStopId} không thuộc tuyến đường của chuyến xe`,
          );
        }
        if (submittedStopIds.has(stop.routeStopId)) {
          throw new BadRequestException(
            `Điểm dừng ${stop.routeStopId} bị trùng lặp trong danh sách cấu hình`,
          );
        }
        submittedStopIds.add(stop.routeStopId);

        if (submittedOrders.has(stop.order)) {
          throw new BadRequestException(
            `Thứ tự điểm dừng ${stop.order} bị trùng lặp`,
          );
        }
        submittedOrders.add(stop.order);

        if (stop.scheduledAt) {
          const stopTimeMs = new Date(stop.scheduledAt).getTime();
          if (
            !Number.isFinite(stopTimeMs) ||
            stopTimeMs < departureMs ||
            stopTimeMs > arrivalMs
          ) {
            throw new BadRequestException(
              `Thời gian đón/trả tại điểm thứ tự ${stop.order} phải nằm trong khoảng thời gian khởi hành và kết thúc của chuyến`,
            );
          }
          if (prevScheduledAt !== null && stopTimeMs <= prevScheduledAt) {
            throw new BadRequestException(
              `Thời gian đón/trả tại điểm thứ tự ${stop.order} không được sớm hơn điểm dừng trước đó`,
            );
          }
          prevScheduledAt = stopTimeMs;
        }
      }

      const stopOverrides = sortedStops.map((s) => ({
        routeStopId: s.routeStopId,
        order: s.order,
        type: s.type ?? 'BOTH',
        scheduledAt: s.scheduledAt ?? null,
        pickupAllowed: s.pickupAllowed ?? s.type !== 'DROPOFF',
        dropoffAllowed: s.dropoffAllowed ?? s.type !== 'PICKUP',
      }));

      const updated = await tx.trip.update({
        where: { id: tripId },
        data: {
          stopOverrides: stopOverrides as unknown as Prisma.InputJsonValue,
        } as any,
      });

      await (tx as any).transportAudit.create({
        data: {
          actorId: userId,
          tripId,
          action: 'SET_TRIP_STOPS',
          detail: { stopsCount: stopOverrides.length },
        },
      });

      return {
        tripId: updated.id,
        stopOverrides: (updated as any).stopOverrides,
      };
    });
  }
}
