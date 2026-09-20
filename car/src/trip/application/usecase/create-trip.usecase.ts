import {
  Inject,
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ICreateTripUseCase } from '../port/create-trip.usecase.interface';
import { CreateTripInput } from '../dto/create-trip.input';
import { CreateTripOutput } from '../dto/create-trip.output';
import type { ITripRepository } from '../../domain/repository/trip.repository.interface';
import { Trip } from '../../domain/entity/trip.entity';
import { TripStatus } from '../../domain/value-object/trip-status.enum';

@Injectable()
export class CreateTripUseCase implements ICreateTripUseCase {
  constructor(
    @Inject('ITripRepository')
    private readonly tripRepository: ITripRepository,
  ) {}

  async execute(input: CreateTripInput): Promise<CreateTripOutput> {
    if (!input.userId || !input.userId.trim()) {
      throw new BadRequestException('Vui lòng cung cấp mã người dùng (userId).');
    }

    // 1. Kiểm tra / lấy Operator ID của User
    const operatorId = await this.tripRepository.findOperatorIdByUserId(input.userId);
    if (!operatorId) {
      throw new ForbiddenException(
        'Tài khoản của bạn chưa được cấp quyền Nhà xe (Operator). Vui lòng nộp đơn đăng ký Nhà xe và chờ Admin phê duyệt.',
      );
    }

    // 2. Chuyển đổi và validate thời gian đi / đến
    const departureDate = new Date(input.departureTime);
    const arrivalDate = new Date(input.arrivalTime);

    if (isNaN(departureDate.getTime()) || isNaN(arrivalDate.getTime())) {
      throw new BadRequestException('Thời gian xuất bến hoặc thời gian đến nơi không đúng định dạng ngày giờ.');
    }

    if (departureDate.getTime() <= Date.now()) {
      throw new BadRequestException('Thời gian xuất bến phải là thời điểm trong tương lai.');
    }

    if (arrivalDate.getTime() <= departureDate.getTime()) {
      throw new BadRequestException('Thời gian đến dự kiến phải sau thời gian xuất bến.');
    }

    // 3. Kiểm tra Tuyến đường (Phải thuộc sở hữu của nhà xe & đang ACTIVE)
    const route = await this.tripRepository.findRouteById(input.routeId);
    if (!route || route.operatorId !== operatorId) {
      throw new NotFoundException(
        'Không tìm thấy tuyến đường được chọn hoặc tuyến đường không thuộc quyền quản lý của nhà xe.',
      );
    }

    if (route.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Tuyến đường này hiện đang tạm ngừng khai thác (INACTIVE), không thể lên lịch chuyến xe mới.',
      );
    }

    // 4. Kiểm tra Xe khách (Phải thuộc sở hữu của nhà xe & đang ACTIVE)
    const car = await this.tripRepository.findCarById(input.carId);
    if (!car || car.operatorId !== operatorId) {
      throw new NotFoundException(
        'Không tìm thấy xe khách được chọn hoặc xe không thuộc quyền quản lý của nhà xe.',
      );
    }

    if (car.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Xe khách này hiện không sẵn sàng hoạt động (đang bảo trì hoặc bị khóa).',
      );
    }

    // 5. Kiểm tra chống trùng lịch xe (Overlap Check)
    const isConflict = await this.tripRepository.checkCarScheduleConflict(
      input.carId,
      departureDate,
      arrivalDate,
    );

    if (isConflict) {
      throw new ConflictException(
        `Xe khách [${car.licensePlate}] đã có lịch vận hành cho một chuyến đi khác trong khoảng thời gian này. Vui lòng chọn xe khác hoặc đổi khung giờ.`,
      );
    }

    // 6. Khởi tạo Domain Entity Trip (Validate nghiệp vụ cấp Domain)
    let tripEntity: Trip;
    try {
      tripEntity = Trip.create({
        operatorId,
        routeId: input.routeId,
        carId: input.carId,
        departureTime: departureDate,
        arrivalTime: arrivalDate,
        pricePerSeat: input.pricePerSeat,
        status: TripStatus.SCHEDULED,
      });
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }

    // 7. Lưu qua Repository
    const savedTrip = await this.tripRepository.save(tripEntity);

    // 8. Trả về Output DTO
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
