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
import type { ITripRepository } from '../../domain/repository/trip.repository.interface';

@Injectable()
export class UpdateTripStatusUseCase implements IUpdateTripStatusUseCase {
  constructor(
    @Inject('ITripRepository')
    private readonly tripRepository: ITripRepository,
  ) {}

  async execute(input: UpdateTripStatusInput): Promise<UpdateTripStatusOutput> {
    if (!input.userId || !input.userId.trim()) {
      throw new BadRequestException('Vui lòng cung cấp mã người dùng (userId).');
    }

    if (!input.tripId || !input.tripId.trim()) {
      throw new BadRequestException('Vui lòng cung cấp mã chuyến xe (tripId).');
    }

    // 1. Kiểm tra / lấy Operator ID của User
    const operatorId = await this.tripRepository.findOperatorIdByUserId(input.userId);
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

    // 3. Thực hiện chuyển đổi trạng thái thông qua Domain Entity (State Machine)
    try {
      trip.changeStatus(input.status);
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }

    // 4. Lưu trạng thái mới vào CSDL thông qua Repository
    const savedTrip = await this.tripRepository.save(trip);

    // 5. Trả về DTO kết quả
    return {
      id: savedTrip.id!,
      operatorId: savedTrip.operatorId,
      routeId: savedTrip.routeId,
      carId: savedTrip.carId,
      departureTime: savedTrip.departureTime,
      arrivalTime: savedTrip.arrivalTime,
      pricePerSeat: savedTrip.pricePerSeat,
      status: savedTrip.status,
      createdAt: savedTrip.createdAt!,
      updatedAt: savedTrip.updatedAt!,
    };
  }
}
