import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { IGetManageTripDetailUseCase } from '../../application/port/get-manage-trip-detail.usecase.interface';
import type { ITripRepository } from '../../domain/repository/trip.repository.interface';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PrismaGetManageTripDetailManagement implements IGetManageTripDetailUseCase {
  constructor(
    @Inject('ITripRepository')
    private readonly tripRepository: ITripRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(tripId: string, userId: string): Promise<any> {
    if (!tripId || !tripId.trim())
      throw new BadRequestException('Mã chuyến không hợp lệ');

    const operatorId = await this.tripRepository.findOperatorIdByUserId(userId);

    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        operator: true,
        car: {
          include: {
            seatTemplates: { orderBy: [{ level: 'asc' }, { code: 'asc' }] },
          },
        },
        route: { include: { stops: { orderBy: { order: 'asc' } } } },
        cancellation: true,
      },
    });

    if (!trip) throw new NotFoundException('Không tìm thấy chuyến');

    // Verify ownership or staff access
    if (trip.operatorId !== operatorId) {
      const staff = (await this.prisma.operatorStaff.findFirst({
        where: { operatorId: trip.operatorId, userId, active: true },
      })) as any;
      if (!staff) throw new ForbiddenException('Không có quyền truy cập');
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

    return {
      id: trip.id,
      operatorId: trip.operatorId,
      routeId: trip.routeId,
      carId: trip.carId,
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
      priceVnd: (trip.priceVnd ?? trip.pricePerSeat).toString(),
      searchPriceVnd: (trip as any).searchPriceVnd?.toString(),
      classPrices: (trip as any).classPrices,
      status: trip.status,
      offerListingId: trip.offerListingId,
      saleSnapshot: (trip as any).saleSnapshot,
      inventorySyncVersion: (trip as any).inventorySyncVersion,
      inventorySyncedVersion: (trip as any).inventorySyncedVersion,
      cancellation: trip.cancellation,
      stopOverrides: (trip as any).stopOverrides,
      car: {
        id: trip.car.id,
        name: trip.car.name,
        type: trip.car.type,
        status: trip.car.status,
        licensePlate: trip.car.licensePlate,
        totalSeats: trip.car.totalSeats,
        seatTemplates: trip.car.seatTemplates,
      },
      route: {
        id: trip.route.id,
        origin: trip.route.origin,
        destination: trip.route.destination,
        status: trip.route.status,
        deletedAt: trip.route.deletedAt,
        createdAt: trip.route.createdAt,
        updatedAt: trip.route.updatedAt,
        stops: trip.route.stops,
      },
    };
  }
}
