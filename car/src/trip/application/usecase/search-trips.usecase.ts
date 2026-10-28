import {
  vietnamDayBounds,
  vietnamToday,
} from '../../domain/value-object/vietnam-day';
import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { ISearchTripsUseCase } from '../port/search-trips.usecase.interface';
import { SearchTripsInput } from '../dto/search-trips.input';
import { SearchTripsOutput } from '../dto/search-trips.output';
import type { ITripRepository } from '../../domain/repository/trip.repository.interface';
import type { TransportIntegrations } from '../../../transport/application/transport-integrations.port';

@Injectable()
export class SearchTripsUseCase implements ISearchTripsUseCase {
  constructor(
    @Inject('ITripRepository')
    private readonly tripRepository: ITripRepository,
    @Inject('TransportIntegrations')
    private readonly inventory: TransportIntegrations,
  ) {}

  async execute(input: SearchTripsInput): Promise<SearchTripsOutput> {
    const discover = input.discover === true;
    const origin = input.origin?.trim() || undefined;
    const destination = input.destination?.trim() || undefined;
    const departureDate = input.departureDate?.trim() || undefined;
    if (!discover && (!origin || !destination)) {
      throw new BadRequestException(
        'Vui lòng chọn điểm khởi hành và điểm đến.',
      );
    }
    if (!discover && !departureDate) {
      throw new BadRequestException('Vui lòng chọn ngày khởi hành.');
    }
    if (departureDate) {
      try {
        vietnamDayBounds(departureDate);
      } catch {
        throw new BadRequestException('Ngày khởi hành không hợp lệ.');
      }
      if (departureDate < vietnamToday())
        throw new BadRequestException(
          'Ngày khởi hành không được ở trong quá khứ.',
        );
    }

    // 3. Chuẩn hóa phân trang & sắp xếp
    const page = Math.max(1, input.page || 1);
    const limit = Math.max(1, Math.min(50, input.limit || 10));
    const sortBy = input.sortBy || 'departureTime';
    const sortOrder = input.sortOrder || 'asc';

    if (
      input.minPrice !== undefined &&
      input.maxPrice !== undefined &&
      BigInt(input.minPrice) > BigInt(input.maxPrice)
    ) {
      throw new BadRequestException(
        'Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu',
      );
    }
    const day = departureDate ? vietnamDayBounds(departureDate) : null;
    const slots = [...(input.timeSlots ?? [])];
    if (input.timeOfDay)
      slots.push(
        {
          morning: '05:00-12:00',
          afternoon: '12:00-18:00',
          evening: '18:00-00:00',
        }[input.timeOfDay],
      );
    const minuteRanges = slots.flatMap((slot) => {
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d-(?:[01]\d|2[0-3]):[0-5]\d$/.test(slot))
        throw new BadRequestException('Khoảng giờ không hợp lệ');
      const [from, to] = slot.split('-').map((value) => {
        const [h, m] = value.split(':').map(Number);
        return h * 60 + m;
      });
      if (from === to)
        throw new BadRequestException('Khoảng giờ phải có độ dài lớn hơn 0');
      return to > from
        ? [{ start: from, end: to }]
        : [
            { start: from, end: 1440 },
            { start: 0, end: to },
          ].filter((range) => range.start < range.end);
    });
    const departureRanges = day
      ? minuteRanges.map((range) => ({
          start: new Date(day.start.getTime() + range.start * 60000),
          end: new Date(day.start.getTime() + range.end * 60000),
        }))
      : [];
    const activeRouteIds = await this.inventory.activeOfferRoutes();

    // 4. Truy vấn chuyến xe từ Repository
    const preferredOrigin =
      discover && !origin && !destination && !input.originRegion && !input.destinationRegion
        ? input.preferredOrigin?.trim() || undefined
        : undefined;
    const query = {
      activeRouteIds,
      originRegion: input.originRegion?.trim() || undefined,
      destinationRegion: input.destinationRegion?.trim() || undefined,
      departureRanges,
      minuteRanges: day ? [] : minuteRanges,
      origin: origin || preferredOrigin,
      destination,
      departureDate,
      type: input.type,
      minPrice: input.minPrice,
      maxPrice: input.maxPrice,
      operatorId: input.operatorId,
      sortBy,
      sortOrder,
      page,
      limit,
    };
    let queryResult = await this.tripRepository.searchCustomerTrips(query);
    let usedNearby = Boolean(preferredOrigin);
    if (preferredOrigin && queryResult.total === 0) {
      usedNearby = false;
      queryResult = await this.tripRepository.searchCustomerTrips({
        ...query,
        origin: undefined,
      });
    }

    // Inventory is the source of truth for occupied seats. Fail the search
    // when it cannot be reached rather than advertising stale availability.
    await Promise.all(
      queryResult.trips.map(async (trip) => {
        const seats = await this.inventory.getSeatStatus(trip.id);
        const unavailable = seats.filter(
          (seat) => seat.status !== 'AVAILABLE',
        ).length;
        trip.seats = {
          totalSeats: seats.length,
          bookedSeats: unavailable,
          availableSeats: seats.length - unavailable,
          isSoldOut: unavailable === seats.length,
        };
      }),
    );

    const totalPages = Math.ceil(queryResult.total / limit) || 0;

    // 5. Trả về kết quả
    return {
      discovery: discover
        ? {
            origin: preferredOrigin,
            nearby: usedNearby,
            fallback: Boolean(preferredOrigin) && !usedNearby,
          }
        : undefined,
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
