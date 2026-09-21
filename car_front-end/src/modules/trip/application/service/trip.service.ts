import type {
  ITripService,
  GetTripsParams,
  GetTripsResult,
  CreateTripDTO,
  SearchTripsParams,
  SearchTripsResult,
} from "../port/trip.service.interface";
import { TripEntity } from "../../domain/entity/trip.entity";
import { CustomerTripEntity } from "../../domain/entity/customer-trip.entity";
import {
  type TripStatus,
  TripStatusVO,
} from "../../domain/value-object/trip-status.vo";
import { TripTimeVO } from "../../domain/value-object/trip-time.vo";
import { TripPriceVO } from "../../domain/value-object/trip-price.vo";
import { TripSearchQueryVO } from "../../domain/value-object/trip-search-query.vo";
import { tokenStorage } from "@/modules/auth/composition";
import { routeService } from "@/modules/route/composition";

export class TripService implements ITripService {
  private readonly apiBaseUrl: string;

  constructor(apiBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl;
  }

  async getTrips(params?: GetTripsParams): Promise<GetTripsResult> {
    const token = tokenStorage.getToken();
    const query = new URLSearchParams();

    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.keyword && params.keyword.trim()) {
      query.append("keyword", params.keyword.trim());
    }
    if (params?.status && params.status.trim()) {
      query.append("status", params.status.trim());
    }
    if (params?.routeId && params.routeId.trim()) {
      query.append("routeId", params.routeId.trim());
    }
    if (params?.carId && params.carId.trim()) {
      query.append("carId", params.carId.trim());
    }
    if (params?.departureDate && params.departureDate.trim()) {
      query.append("departureDate", params.departureDate.trim());
    }
    if (params?.sortBy) query.append("sortBy", params.sortBy);
    if (params?.sortOrder) query.append("sortOrder", params.sortOrder);

    const url = `${this.apiBaseUrl}/api/v1/trips${
      query.toString() ? `?${query.toString()}` : ""
    }`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (res.status === 401) {
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }

    if (res.status === 403) {
      throw new Error(
        "Tài khoản của bạn chưa được cấp quyền Nhà xe (Operator). Vui lòng nộp đơn đăng ký Nhà xe và chờ Admin phê duyệt."
      );
    }

    if (!res.ok) {
      const errorJson = await res.json().catch(() => null);
      const msg = Array.isArray(errorJson?.message)
        ? errorJson.message.join(", ")
        : errorJson?.message || "Không thể tải danh sách chuyến xe.";
      throw new Error(msg);
    }

    const json = await res.json();
    const responseData = json.data || json;

    const rawList = Array.isArray(responseData?.data)
      ? responseData.data
      : Array.isArray(responseData)
        ? responseData
        : [];

    const tripEntities = rawList.map((item: any) =>
      TripEntity.fromApiResponse(item)
    );

    const rawKpi = responseData?.kpi || json?.kpi || {};
    const kpi = {
      totalTrips: Number(rawKpi.totalTrips) || 0,
      scheduledTrips: Number(rawKpi.scheduledTrips) || 0,
      departedTrips: Number(rawKpi.departedTrips) || 0,
      completedTrips: Number(rawKpi.completedTrips) || 0,
      cancelledTrips: Number(rawKpi.cancelledTrips) || 0,
    };

    const rawPagination = responseData?.pagination || json?.pagination || {};
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
    const token = tokenStorage.getToken();

    // 1. Client-side Domain Validation
    if (!dto.routeId || !dto.routeId.trim()) {
      throw new Error("Vui lòng chọn tuyến đường.");
    }

    if (!dto.carId || !dto.carId.trim()) {
      throw new Error("Vui lòng chọn xe khách vận hành.");
    }

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

    // 2. Prepare payload
    const payload = {
      routeId: dto.routeId.trim(),
      carId: dto.carId.trim(),
      departureTime: new Date(dto.departureTime).toISOString(),
      arrivalTime: new Date(dto.arrivalTime).toISOString(),
      pricePerSeat: Math.round(Number(dto.pricePerSeat)),
    };

    const res = await fetch(`${this.apiBaseUrl}/api/v1/trips`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }

    if (res.status === 403) {
      throw new Error(
        "Tài khoản của bạn chưa được cấp quyền Nhà xe (Operator). Vui lòng nộp đơn đăng ký Nhà xe và chờ Admin phê duyệt."
      );
    }

    if (res.status === 409) {
      const conflictJson = await res.json().catch(() => null);
      throw new Error(
        conflictJson?.message ||
          "Xe khách đã có lịch vận hành cho một chuyến đi khác trong khoảng thời gian này. Vui lòng chọn xe khác hoặc đổi khung giờ."
      );
    }

    if (!res.ok) {
      const errorJson = await res.json().catch(() => null);
      const msg = Array.isArray(errorJson?.message)
        ? errorJson.message.join(", ")
        : errorJson?.message || "Lên lịch chuyến xe mới thất bại.";
      throw new Error(msg);
    }

    const json = await res.json();
    const createdData = json.data || json;
    return TripEntity.fromApiResponse(createdData);
  }

  async updateTripStatus(
    tripId: string,
    status: TripStatus
  ): Promise<TripEntity> {
    const token = tokenStorage.getToken();

    if (!tripId || !tripId.trim()) {
      throw new Error("Mã chuyến xe không hợp lệ.");
    }

    if (!TripStatusVO.isValid(status)) {
      throw new Error("Trạng thái chuyến xe không hợp lệ.");
    }

    const res = await fetch(
      `${this.apiBaseUrl}/api/v1/trips/${tripId.trim()}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status }),
      }
    );

    if (res.status === 401) {
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }

    if (res.status === 403) {
      throw new Error(
        "Tài khoản của bạn chưa được cấp quyền Nhà xe (Operator). Vui lòng nộp đơn đăng ký Nhà xe và chờ Admin phê duyệt."
      );
    }

    if (res.status === 404) {
      throw new Error(
        "Không tìm thấy chuyến xe yêu cầu hoặc bạn không có quyền thao tác trên chuyến xe này."
      );
    }

    if (!res.ok) {
      const errorJson = await res.json().catch(() => null);
      const msg = Array.isArray(errorJson?.message)
        ? errorJson.message.join(", ")
        : errorJson?.message || "Cập nhật trạng thái chuyến xe thất bại.";
      throw new Error(msg);
    }

    const json = await res.json();
    const updatedData = json.data || json;
    return TripEntity.fromApiResponse(updatedData);
  }

  async searchTrips(params: SearchTripsParams): Promise<SearchTripsResult> {
    // 1. Client-side Domain Validation
    const validation = TripSearchQueryVO.validate(params);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      throw new Error(firstError || "Tiêu chí tìm kiếm không hợp lệ.");
    }

    // 2. Build Query String
    const query = new URLSearchParams();
    query.append("origin", params.origin.trim());
    query.append("destination", params.destination.trim());
    query.append("departureDate", params.departureDate.trim());

    if (params.type && params.type.trim()) {
      query.append("type", params.type.trim());
    }
    if (params.minPrice !== undefined && params.minPrice !== null) {
      query.append("minPrice", String(params.minPrice));
    }
    if (params.maxPrice !== undefined && params.maxPrice !== null) {
      query.append("maxPrice", String(params.maxPrice));
    }
    if (params.operatorId && params.operatorId.trim()) {
      query.append("operatorId", params.operatorId.trim());
    }
    if (params.sortBy) {
      query.append("sortBy", params.sortBy);
    }
    if (params.sortOrder) {
      query.append("sortOrder", params.sortOrder);
    }
    if (params.page) {
      query.append("page", String(params.page));
    }
    if (params.limit) {
      query.append("limit", String(params.limit));
    }

    // 3. Public API call (No Auth Token required)
    const url = `${this.apiBaseUrl}/api/v1/trips/search?${query.toString()}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => null);
      const msg = Array.isArray(errorJson?.message)
        ? errorJson.message.join(", ")
        : errorJson?.message || "Tìm kiếm chuyến xe thất bại.";
      throw new Error(msg);
    }

    const json = await res.json();
    const responseData = json.data || json;

    const rawList = Array.isArray(responseData?.data)
      ? responseData.data
      : Array.isArray(responseData)
        ? responseData
        : [];

    let customerTrips = rawList.map((item: any) =>
      CustomerTripEntity.fromApiResponse(item)
    );

    // Filter by departure time range if specified (EARLY_MORNING: 0h-6h, MORNING: 6h-12h, AFTERNOON: 12h-18h, EVENING: 18h-24h)
    if (params.timeRange) {
      customerTrips = customerTrips.filter((trip: CustomerTripEntity) => {
        try {
          const hour = new Date(trip.departureTime).getHours();
          switch (params.timeRange) {
            case "EARLY_MORNING":
              return hour >= 0 && hour < 6;
            case "MORNING":
              return hour >= 6 && hour < 12;
            case "AFTERNOON":
              return hour >= 12 && hour < 18;
            case "EVENING":
              return hour >= 18 && hour < 24;
            default:
              return true;
          }
        } catch {
          return true;
        }
      });
    }

    const rawPagination = responseData?.pagination || json?.pagination || {};
    const pagination = {
      page: Number(rawPagination.page) || params.page || 1,
      limit: Number(rawPagination.limit) || params.limit || 10,
      total:
        Number(rawPagination.total ?? rawPagination.totalItems) ||
        customerTrips.length,
      totalPages: Number(rawPagination.totalPages) || 1,
    };

    return {
      data: customerTrips,
      pagination,
    };
  }

  async getLocations(): Promise<string[]> {
    return routeService.getLocations();
  }
}
