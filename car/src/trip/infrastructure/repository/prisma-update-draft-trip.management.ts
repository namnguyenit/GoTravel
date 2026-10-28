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
  IUpdateDraftTripUseCase,
  UpdateDraftTripInput,
} from '../../application/port/update-draft-trip.usecase.interface';
import type { ITripRepository } from '../../domain/repository/trip.repository.interface';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PrismaUpdateDraftTripManagement implements IUpdateDraftTripUseCase {
  constructor(
    @Inject('ITripRepository')
    private readonly tripRepository: ITripRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: UpdateDraftTripInput): Promise<any> {
    const { tripId, userId, dto } = input;
    if (!tripId || !tripId.trim())
      throw new BadRequestException('Mã chuyến không hợp lệ');

    const operatorId = await this.tripRepository.findOperatorIdByUserId(userId);

    return this.prisma.$transaction(async (tx) => {
      const refs = await tx.trip.findUnique({ where: { id: tripId } });
      if (!refs) throw new NotFoundException('Không tìm thấy chuyến');
      for (const id of [
        ...new Set([refs.carId, dto.carId ?? refs.carId]),
      ].sort())
        await tx.$queryRaw`SELECT id FROM cars WHERE id=${id} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM operators WHERE id=${refs.operatorId} FOR UPDATE`;
      for (const id of [
        ...new Set([refs.routeId, dto.routeId ?? refs.routeId]),
      ].sort())
        await tx.$queryRaw`SELECT id FROM routes WHERE id=${id} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM trips WHERE id = ${tripId} FOR UPDATE`;

      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        include: { car: { include: { seatTemplates: true } }, route: true },
      });

      if (!trip) throw new NotFoundException('Không tìm thấy chuyến');
      if (trip.carId !== refs.carId || trip.routeId !== refs.routeId)
        throw new ConflictException('Chuyến vừa được sửa; thử lại');

      // Verify ownership or staff permission
      if (trip.operatorId !== operatorId) {
        const staff = (await tx.operatorStaff.findFirst({
          where: { operatorId: trip.operatorId, userId, active: true },
        })) as any;
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
          'Chỉ có thể sửa chuyến xe ở trạng thái DRAFT',
        );
      }

      const nextRouteId = dto.routeId ?? trip.routeId;
      const nextCarId = dto.carId ?? trip.carId;
      const nextDeparture = dto.departureTime
        ? new Date(dto.departureTime)
        : trip.departureTime;
      const nextArrival = dto.arrivalTime
        ? new Date(dto.arrivalTime)
        : trip.arrivalTime;
      const nextPriceVnd = dto.priceVnd
        ? new Prisma.Decimal(dto.priceVnd)
        : (trip.priceVnd ?? new Prisma.Decimal(trip.pricePerSeat));

      if (nextDeparture <= new Date()) {
        throw new BadRequestException(
          'Thời gian khởi hành phải trong tương lai',
        );
      }
      if (nextArrival <= nextDeparture) {
        throw new BadRequestException(
          'Thời gian đến dự kiến phải sau thời gian khởi hành',
        );
      }

      // Validate route
      if (dto.routeId && dto.routeId !== trip.routeId) {
        const route = await tx.route.findUnique({ where: { id: dto.routeId } });
        if (
          !route ||
          route.operatorId !== trip.operatorId ||
          route.status !== 'ACTIVE' ||
          route.deletedAt !== null
        ) {
          throw new BadRequestException(
            'Tuyến đường không hợp lệ hoặc đang ngừng hoạt động',
          );
        }
      }

      // Validate car
      let nextClassPrices = (trip as any).classPrices;
      if (dto.carId && dto.carId !== trip.carId) {
        const car = await tx.car.findUnique({
          where: { id: dto.carId },
          include: { seatTemplates: true },
        });
        if (
          !car ||
          car.operatorId !== trip.operatorId ||
          car.status !== 'ACTIVE' || car.deletedAt !== null
        ) {
          throw new BadRequestException(
            'Xe không hợp lệ hoặc đang ngừng hoạt động',
          );
        }
        // Changing car clears class pricing overrides
        nextClassPrices = null;
      }

      // Check schedule overlap
      const overlap = await tx.trip.findFirst({
        where: {
          id: { not: tripId },
          carId: nextCarId,
          status: { notIn: ['CANCELLED'] },
          departureTime: { lt: nextArrival },
          arrivalTime: { gt: nextDeparture },
        },
      });
      if (overlap) {
        throw new ConflictException(
          'Xe đã được phân công cho chuyến khác trong khoảng thời gian này (trùng lịch).',
        );
      }

      // Compute search price floor
      const targetCar = await tx.car.findUnique({
        where: { id: nextCarId },
        include: { seatTemplates: true },
      });
      if (!targetCar || targetCar.deletedAt || targetCar.status !== 'ACTIVE') throw new BadRequestException('Xe đã xóa hoặc đang ngừng hoạt động. Hãy chọn xe khác.');
      const activePrices = targetCar.seatTemplates
        .filter((s) => s.active)
        .map((s) =>
          BigInt(
            (nextClassPrices as Record<string, string> | null)?.[s.seatClass] ??
              nextPriceVnd.toString(),
          ),
        );
      const searchPriceVnd = new Prisma.Decimal(
        activePrices.length
          ? activePrices.reduce((a, b) => (a < b ? a : b)).toString()
          : nextPriceVnd.toString(),
      );

      try {
        const updated = await tx.trip.update({
          where: { id: tripId },
          data: {
            stopOverrides:
              (dto.routeId && dto.routeId !== trip.routeId) ||
              nextDeparture.getTime() !== trip.departureTime.getTime() ||
              nextArrival.getTime() !== trip.arrivalTime.getTime()
                ? Prisma.DbNull
                : ((trip as any).stopOverrides ?? Prisma.DbNull),
            routeId: nextRouteId,
            carId: nextCarId,
            departureTime: nextDeparture,
            arrivalTime: nextArrival,
            priceVnd: nextPriceVnd,
            pricePerSeat: Number(nextPriceVnd),
            searchPriceVnd: searchPriceVnd as any,
            classPrices: nextClassPrices ?? Prisma.DbNull,
          },
          include: {
            car: true,
            route: { include: { stops: { orderBy: { order: 'asc' } } } },
          },
        });

        await (tx as any).transportAudit.create({
          data: {
            actorId: userId,
            tripId,
            action: 'UPDATE_DRAFT',
            detail: dto,
          },
        });

        return {
          id: updated.id,
          operatorId: updated.operatorId,
          routeId: updated.routeId,
          carId: updated.carId,
          departureTime: updated.departureTime,
          arrivalTime: updated.arrivalTime,
          priceVnd: updated.priceVnd?.toString(),
          status: updated.status,
          car: {
            id: (updated as any).car.id,
            name: (updated as any).car.name,
            licensePlate: (updated as any).car.licensePlate,
          },
          route: {
            id: (updated as any).route.id,
            origin: (updated as any).route.origin,
            destination: (updated as any).route.destination,
          },
        };
      } catch (err: any) {
        if (
          err.message &&
          err.message.includes('trips_car_schedule_no_overlap')
        ) {
          throw new ConflictException(
            'Xe bị trùng lịch trình với chuyến khác theo ràng buộc hệ thống',
          );
        }
        throw err;
      }
    });
  }
}
