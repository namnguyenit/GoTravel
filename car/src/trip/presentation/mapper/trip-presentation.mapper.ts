import { CreateTripDto } from '../dto/create-trip.dto';
import { GetTripsQueryDto } from '../dto/get-trips-query.dto';
import { UpdateTripStatusDto } from '../dto/update-trip-status.dto';
import { SearchTripsQueryDto } from '../dto/search-trips-query.dto';
import { CreateTripInput } from '../../application/dto/create-trip.input';
import { CreateTripOutput } from '../../application/dto/create-trip.output';
import { GetTripsInput } from '../../application/dto/get-trips.input';
import { GetTripsOutput } from '../../application/dto/get-trips.output';
import { UpdateTripStatusInput } from '../../application/dto/update-trip-status.input';
import { UpdateTripStatusOutput } from '../../application/dto/update-trip-status.output';
import { SearchTripsInput } from '../../application/dto/search-trips.input';
import { SearchTripsOutput } from '../../application/dto/search-trips.output';

export class TripPresentationMapper {
  public static toCreateTripInput(dto: CreateTripDto, userId: string): CreateTripInput {
    return {
      userId,
      routeId: dto.routeId,
      carId: dto.carId,
      departureTime: dto.departureTime,
      arrivalTime: dto.arrivalTime,
      pricePerSeat: dto.pricePerSeat,
    };
  }

  public static toCreateTripApiResponse(output: CreateTripOutput) {
    return {
      success: true,
      code: 'CREATE_TRIP_SUCCESS',
      message: 'Lên lịch chuyến xe mới thành công!',
      data: {
        id: output.id,
        operatorId: output.operatorId,
        routeId: output.routeId,
        carId: output.carId,
        departureTime: output.departureTime,
        arrivalTime: output.arrivalTime,
        pricePerSeat: output.pricePerSeat,
        status: output.status,
        createdAt: output.createdAt,
        updatedAt: output.updatedAt,
      },
    };
  }

  public static toGetTripsInput(query: GetTripsQueryDto, userId: string): GetTripsInput {
    return {
      userId,
      keyword: query.keyword,
      status: query.status,
      routeId: query.routeId,
      carId: query.carId,
      departureDate: query.departureDate,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      page: query.page,
      limit: query.limit,
    };
  }

  public static toGetTripsApiResponse(output: GetTripsOutput) {
    return {
      success: true,
      code: 'GET_TRIPS_SUCCESS',
      message: 'Lấy danh sách chuyến xe thành công.',
      data: {
        kpi: output.kpi,
        pagination: output.pagination,
        data: output.data,
      },
    };
  }

  public static toUpdateTripStatusInput(
    tripId: string,
    dto: UpdateTripStatusDto,
    userId: string,
  ): UpdateTripStatusInput {
    return {
      userId,
      tripId,
      status: dto.status,
    };
  }

  public static toUpdateTripStatusApiResponse(output: UpdateTripStatusOutput) {
    return {
      success: true,
      code: 'UPDATE_TRIP_STATUS_SUCCESS',
      message: 'Cập nhật trạng thái chuyến xe thành công!',
      data: {
        id: output.id,
        operatorId: output.operatorId,
        routeId: output.routeId,
        carId: output.carId,
        departureTime: output.departureTime,
        arrivalTime: output.arrivalTime,
        pricePerSeat: output.pricePerSeat,
        status: output.status,
        createdAt: output.createdAt,
        updatedAt: output.updatedAt,
      },
    };
  }

  public static toSearchTripsInput(query: SearchTripsQueryDto): SearchTripsInput {
    return {
      origin: query.origin,
      destination: query.destination,
      departureDate: query.departureDate,
      type: query.type,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      operatorId: query.operatorId,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      page: query.page,
      limit: query.limit,
    };
  }

  public static toSearchTripsApiResponse(output: SearchTripsOutput) {
    return {
      success: true,
      code: 'SEARCH_TRIPS_SUCCESS',
      message:
        output.data.length > 0
          ? 'Tìm kiếm chuyến xe thành công.'
          : 'Không tìm thấy chuyến xe phù hợp với điều kiện tìm kiếm.',
      data: {
        pagination: output.pagination,
        data: output.data,
      },
    };
  }
}
