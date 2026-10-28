import type {
  ITripService,
  GetTripsParams,
  GetTripsResult,
  CreateTripDTO,
  SearchTripsParams,
  SearchTripsResult,
  TripPublicDetail,
  TripStopItem,
} from "../port/trip.service.interface";
import { TripEntity } from "../../domain/entity/trip.entity";
import { CustomerTripEntity } from "../../domain/entity/customer-trip.entity";
import { SeatEntity } from "../../domain/entity/seat.entity";
import {
  type TripStatus,
  TripStatusVO,
} from "../../domain/value-object/trip-status.vo";
import { TripTimeVO } from "../../domain/value-object/trip-time.vo";
import { TripPriceVO } from "../../domain/value-object/trip-price.vo";
import { TripSearchQueryVO } from "../../domain/value-object/trip-search-query.vo";
import {
  httpClient,
  type IHttpClient,
} from "@/shared/infrastructure/http/HttpPort";
import { routeService } from "@/modules/route/composition";

export class TripService implements ITripService {
  private readonly http: IHttpClient;

  constructor(http: IHttpClient = httpClient) {
    this.http = http;
  }

  async getTrips(params?: GetTripsParams): Promise<GetTripsResult> {
    const queryParams: Record<string, string | number | undefined> = {};

    if (params?.page) queryParams.page = params.page;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.keyword?.trim()) queryParams.keyword = params.keyword.trim();
    if (params?.status?.trim()) queryParams.status = params.status.trim();
    if (params?.routeId?.trim()) queryParams.routeId = params.routeId.trim();
    if (params?.carId?.trim()) queryParams.carId = params.carId.trim();
    if (params?.departureDate?.trim())
      queryParams.departureDate = params.departureDate.trim();
    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;

    const responseData = await this.http.get<any>("/api/v1/trips", {
      params: queryParams,
    });

    const rawList = Array.isArray(responseData?.data)
      ? responseData.data
      : Array.isArray(responseData)
        ? responseData
        : [];

    const tripEntities = rawList.map((item: any) =>
      TripEntity.fromApiResponse(item)
    );

    const rawKpi = responseData?.kpi || {};
    const kpi = {
      totalTrips: Number(rawKpi.totalTrips) || 0,
      scheduledTrips: Number(rawKpi.scheduledTrips) || 0,
      departedTrips: Number(rawKpi.departedTrips) || 0,
      completedTrips: Number(rawKpi.completedTrips) || 0,
      cancelledTrips: Number(rawKpi.cancelledTrips) || 0,
    };

    const rawPagination = responseData?.pagination || {};
    const pagination = {
      page: Number(rawPagination.page) || params?.page || 1,
      limit: Number(rawPagination.limit) || params?.limit || 10,
      total:
        Number(rawPagination.total ?? rawPagination.totalItems) ||
        tripEntities.length,
      totalPages: Number(rawPagination.totalPages) || 1,
    };

    return {
      data: tripEntities,
      kpi,
      pagination,
    };
  }

  async createTrip(dto: CreateTripDTO): Promise<TripEntity> {
    if (!dto.routeId?.trim()) throw new Error("Vui lòng chọn tuyến đường.");
    if (!dto.carId?.trim()) throw new Error("Vui lòng chọn xe khách vận hành.");

    const timeValidation = TripTimeVO.validate(
      dto.departureTime,
      dto.arrivalTime
    );
    if (!timeValidation.isValid) {
      throw new Error(
        timeValidation.departureError ||
          timeValidation.arrivalError ||
          "Khung giờ vận hành không hợp lệ."
      );
    }

    const priceValidation = TripPriceVO.validate(dto.pricePerSeat);
    if (!priceValidation.isValid) {
      throw new Error(priceValidation.error || "Giá vé không hợp lệ.");
    }

    const payload = {
      routeId: dto.routeId.trim(),
      carId: dto.carId.trim(),
      departureTime: new Date(dto.departureTime).toISOString(),
      arrivalTime: new Date(dto.arrivalTime).toISOString(),
      pricePerSeat: Math.round(Number(dto.pricePerSeat)),
    };

    const createdData = await this.http.post<any>("/api/v1/trips", payload);
    return TripEntity.fromApiResponse(createdData);
  }

  async updateTripStatus(
    tripId: string,
    status: TripStatus
  ): Promise<TripEntity> {
    if (!tripId?.trim()) throw new Error("Mã chuyến xe không hợp lệ.");
    if (!TripStatusVO.isValid(status))
      throw new Error("Trạng thái chuyến xe không hợp lệ.");

    const updatedData = await this.http.patch<any>(
      `/api/v1/trips/${tripId.trim()}/status`,
      { status }
    );
    return TripEntity.fromApiResponse(updatedData);
  }

  async searchTrips(params: SearchTripsParams): Promise<SearchTripsResult> {
    const validation = TripSearchQueryVO.validate(params);
    if (!params.discover && !validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      throw new Error(firstError || "Tiêu chí tìm kiếm không hợp lệ.");
    }

    const queryParams: Record<string, string | number | undefined> = {
      origin: params.origin.trim() || undefined,
      destination: params.destination.trim() || undefined,
      departureDate: params.departureDate.trim() || undefined,
      discover: params.discover ? "true" : undefined,
      preferredOrigin: params.discover ? params.preferredOrigin : undefined,
    };

    if (params.type?.trim()) queryParams.type = params.type.trim();
    if (params.minPrice !== undefined && params.minPrice !== null)
      queryParams.minPrice = params.minPrice;
    if (params.maxPrice !== undefined && params.maxPrice !== null)
      queryParams.maxPrice = params.maxPrice;
    if (params.operatorId?.trim())
      queryParams.operatorId = params.operatorId.trim();
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
    if (params.page) queryParams.page = params.page;
    if (params.limit) queryParams.limit = params.limit;
    const timeSlots: Record<string, string> = {
      EARLY_MORNING: "00:00-06:00",
      MORNING: "06:00-12:00",
      AFTERNOON: "12:00-18:00",
      EVENING: "18:00-00:00",
    };
    if (params.timeRange && timeSlots[params.timeRange]) {
      queryParams.timeRange = params.timeRange;
    }

    const responseData = await this.http.get<any>("/api/v1/trips/search", {
      params: queryParams,
    });

    const rawList = Array.isArray(responseData?.data)
      ? responseData.data
      : Array.isArray(responseData)
        ? responseData
        : [];

    let customerTrips = rawList.map((item: any) =>
      CustomerTripEntity.fromApiResponse(item)
    );

    const rawPagination = responseData?.pagination || {};
    const pagination = {
      page: Number(rawPagination.page) || params.page || 1,
      limit: Number(rawPagination.limit) || params.limit || 10,
      total:
        Number(rawPagination.total ?? rawPagination.totalItems) ||
        customerTrips.length,
      totalPages: Number(rawPagination.totalPages) || 1,
    };

    return {
      discovery: responseData?.discovery,
      data: customerTrips,
      pagination,
    };
  }

  async getLocations(): Promise<string[]> {
    return routeService.getLocations();
  }

  async getTripDetail(tripId: string): Promise<TripPublicDetail> {
    if (!tripId?.trim()) throw new Error("Mã chuyến xe không hợp lệ.");
    return this.http.get<TripPublicDetail>(`/api/v1/trips/${tripId.trim()}`);
  }

  async getTripSeats(tripId: string): Promise<SeatEntity[]> {
    if (!tripId?.trim()) throw new Error("Mã chuyến xe không hợp lệ.");
    const rawSeats = await this.http.get<any[]>(
      `/api/v1/trips/${tripId.trim()}/seats`
    );
    if (!Array.isArray(rawSeats)) return [];
    return rawSeats.map((item) => SeatEntity.fromApiResponse(item));
  }

  async getTripStops(tripId: string): Promise<TripStopItem[]> {
    if (!tripId?.trim()) throw new Error("Mã chuyến xe không hợp lệ.");
    const rawStops = await this.http.get<TripStopItem[]>(
      `/api/v1/trips/${tripId.trim()}/stops`
    );
    if (!Array.isArray(rawStops)) return [];
    return rawStops;
  }

  async getAssignedStaffTrips(operatorId?: string): Promise<TripEntity[]> {
    const responseData = await this.http.get<any>("/api/v1/staff/me/trips");
    const rawList = Array.isArray(responseData?.data)
      ? responseData.data
      : Array.isArray(responseData)
        ? responseData
        : [];
    return rawList
      .filter((item: any) => !operatorId || item.operatorId === operatorId)
      .map((item: any) => TripEntity.fromApiResponse(item));
  }
}
