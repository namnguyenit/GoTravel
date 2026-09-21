import {
  Inject,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { ISearchTripsUseCase } from '../port/search-trips.usecase.interface';
import { SearchTripsInput } from '../dto/search-trips.input';
import { SearchTripsOutput } from '../dto/search-trips.output';
import type { ITripRepository } from '../../domain/repository/trip.repository.interface';

@Injectable()
export class SearchTripsUseCase implements ISearchTripsUseCase {
  constructor(
    @Inject('ITripRepository')
    private readonly tripRepository: ITripRepository,
  ) {}

  async execute(input: SearchTripsInput): Promise<SearchTripsOutput> {
    // 1. Validate điểm đi và điểm đến
    if (!input.origin || !input.origin.trim()) {
      throw new BadRequestException('Điểm khởi hành (origin) không được để trống.');
    }

    if (!input.destination || !input.destination.trim()) {
      throw new BadRequestException('Điểm đến (destination) không được để trống.');
    }

    // 2. Validate ngày khởi hành
    if (!input.departureDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.departureDate)) {
      throw new BadRequestException(
        'Ngày khởi hành (departureDate) phải có định dạng YYYY-MM-DD.',
      );
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (input.departureDate < todayStr) {
      throw new BadRequestException('Ngày khởi hành không được ở trong quá khứ.');
    }

    // 3. Chuẩn hóa phân trang & sắp xếp
    const page = Math.max(1, input.page || 1);
    const limit = Math.max(1, Math.min(50, input.limit || 10));
    const sortBy = input.sortBy || 'departureTime';
    const sortOrder = input.sortOrder || 'asc';

    // 4. Truy vấn chuyến xe từ Repository
    const queryResult = await this.tripRepository.searchCustomerTrips({
      origin: input.origin.trim(),
      destination: input.destination.trim(),
      departureDate: input.departureDate,
      type: input.type,
      minPrice: input.minPrice,
      maxPrice: input.maxPrice,
      operatorId: input.operatorId,
      sortBy,
      sortOrder,
      page,
      limit,
    });

    const totalPages = Math.ceil(queryResult.total / limit) || 0;

    // 5. Trả về kết quả
    return {
      pagination: {
        page,
        limit,
        total: queryResult.total,
        totalPages,
      },
      data: queryResult.trips,
    };
  }
}
