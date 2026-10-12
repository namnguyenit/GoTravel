import {
  Inject,
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { IUpdateTripStatusUseCase } from '../port/update-trip-status.usecase.interface';
import { UpdateTripStatusInput } from '../dto/update-trip-status.input';
import { UpdateTripStatusOutput } from '../dto/update-trip-status.output';
import { TransportOperationsService } from '../../../transport/application/transport-operations.service';
import type { ITripRepository } from '../../domain/repository/trip.repository.interface';

@Injectable()
export class UpdateTripStatusUseCase implements IUpdateTripStatusUseCase {
  constructor(
    @Inject('ITripRepository')
    private readonly tripRepository: ITripRepository,
    private readonly operations: TransportOperationsService,
  ) {}

  async execute(input: UpdateTripStatusInput): Promise<UpdateTripStatusOutput> {
    if (!input.userId || !input.userId.trim()) {
      throw new BadRequestException(
        'Vui lòng cung cấp mã người dùng (userId).',
      );
    }

    if (!input.tripId || !input.tripId.trim()) {
      throw new BadRequestException('Vui lòng cung cấp mã chuyến xe (tripId).');
    }

    // 1. Kiểm tra / lấy Operator ID của User
    const operatorId = await this.tripRepository.findOperatorIdByUserId(
      input.userId,
    );
    if (!operatorId) {
      throw new ForbiddenException(
        'Tài khoản của bạn chưa được cấp quyền Nhà xe (Operator). Vui lòng nộp đơn đăng ký Nhà xe và chờ Admin phê duyệt.',
      );
    }

    // 2. Tìm chuyến xe theo ID
    const trip = await this.tripRepository.findById(input.tripId);
    if (!trip || trip.operatorId !== operatorId) {
      throw new NotFoundException(
        'Không tìm thấy chuyến xe yêu cầu hoặc bạn không có quyền thao tác trên chuyến xe này.',
      );
    }

    if (!['DEPARTED', 'COMPLETED'].includes(input.status)) {
      throw new BadRequestException(
        'Dùng API publish/stop-sale/cancellation cho các trạng thái bán và hủy.',
      );
    }
    const result = await this.operations.lifecycle(
      input.tripId,
      input.userId,
      input.status as 'DEPARTED' | 'COMPLETED',
    );
    const savedTrip = await this.tripRepository.findById(input.tripId);
    if (!savedTrip) throw new NotFoundException();
    return {
      id: savedTrip.id!,
      operatorId: savedTrip.operatorId,
      routeId: savedTrip.routeId,
      carId: savedTrip.carId,
      departureTime: savedTrip.departureTime,
      arrivalTime: savedTrip.arrivalTime,
      pricePerSeat: savedTrip.pricePerSeat,
      priceVnd: savedTrip.priceVnd,
      status: savedTrip.status,
      createdAt: savedTrip.createdAt!,
      updatedAt: savedTrip.updatedAt!,
      inventorySyncPending: result.inventorySyncPending,
    };
  }
}
