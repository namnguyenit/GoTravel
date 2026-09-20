import {
  Inject,
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { IGetTripsUseCase } from '../port/get-trips.usecase.interface';
import { GetTripsInput } from '../dto/get-trips.input';
import { GetTripsOutput } from '../dto/get-trips.output';
import type { ITripRepository } from '../../domain/repository/trip.repository.interface';

@Injectable()
export class GetTripsUseCase implements IGetTripsUseCase {
  constructor(
    @Inject('ITripRepository')
    private readonly tripRepository: ITripRepository,
  ) {}

  async execute(input: GetTripsInput): Promise<GetTripsOutput> {
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

    // 2. Chuẩn hóa phân trang & sắp xếp
    const page = Math.max(1, input.page || 1);
    const limit = Math.max(1, Math.min(100, input.limit || 10));
    const sortBy = input.sortBy || 'departureTime';
    const sortOrder = input.sortOrder || 'asc';

    // 3. Truy vấn danh sách chuyến xe từ Repository
    const queryResult = await this.tripRepository.findManyByOperatorId({
      operatorId,
      keyword: input.keyword,
      status: input.status,
      routeId: input.routeId,
      carId: input.carId,
      departureDate: input.departureDate,
      sortBy,
      sortOrder,
      page,
      limit,
    });

    const totalPages = Math.ceil(queryResult.total / limit) || 1;

    // 4. Map kết quả trả về DTO
    return {
      kpi: queryResult.kpi,
      pagination: {
        page,
        limit,
        total: queryResult.total,
        totalPages,
      },
      data: queryResult.trips.map((item) => {
        const totalSeats = item.car.totalSeats;
        const bookedSeats = item.bookedSeats;
        const availableSeats = Math.max(0, totalSeats - bookedSeats);
        const occupancyRate =
          totalSeats > 0 ? Number(((bookedSeats / totalSeats) * 100).toFixed(2)) : 0;

        return {
          id: item.trip.id!,
          operatorId: item.trip.operatorId,
          departureTime: item.trip.departureTime,
          arrivalTime: item.trip.arrivalTime,
          pricePerSeat: item.trip.pricePerSeat,
          status: item.trip.status,
          route: {
            id: item.route.id,
            origin: item.route.origin,
            destination: item.route.destination,
          },
          car: {
            id: item.car.id,
            name: item.car.name,
            licensePlate: item.car.licensePlate,
            type: item.car.type,
            totalSeats: item.car.totalSeats,
          },
          occupancy: {
            bookedSeats,
            availableSeats,
            occupancyRate,
          },
          createdAt: item.trip.createdAt!,
          updatedAt: item.trip.updatedAt!,
        };
      }),
    };
  }
}
