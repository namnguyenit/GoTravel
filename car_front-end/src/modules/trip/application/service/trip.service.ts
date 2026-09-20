import type {
  ITripService,
  GetTripsParams,
  GetTripsResult,
  CreateTripDTO,
} from "../port/trip.service.interface";
import { TripEntity } from "../../domain/entity/trip.entity";
import {
  type TripStatus,
  TripStatusVO,
} from "../../domain/value-object/trip-status.vo";
import { TripTimeVO } from "../../domain/value-object/trip-time.vo";
import { TripPriceVO } from "../../domain/value-object/trip-price.vo";
import { tokenStorage } from "@/modules/auth/composition";

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
}
