import type {
  IRouteService,
  GetRoutesParams,
  GetRoutesResult,
  CreateRouteDTO,
} from "../port/route.service.interface";
import { RouteEntity } from "../../domain/entity/route.entity";
import { type RouteStatus } from "../../domain/value-object/route-status.vo";
import { RouteLocationVO } from "../../domain/value-object/route-location.vo";
import { RouteStopVO } from "../../domain/value-object/route-stop.vo";
import { tokenStorage } from "@/modules/auth/composition";

export class RouteService implements IRouteService {
  private readonly apiBaseUrl: string;

  constructor(apiBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl;
  }

  async getRoutes(params?: GetRoutesParams): Promise<GetRoutesResult> {
    const token = tokenStorage.getToken();
    const query = new URLSearchParams();

    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.search && params.search.trim()) {
      query.append("search", params.search.trim());
    }
    if (params?.status && params.status.trim()) {
      query.append("status", params.status.trim());
    }
    if (params?.sortBy) query.append("sortBy", params.sortBy);
    if (params?.sortOrder) query.append("sortOrder", params.sortOrder);

    const url = `${this.apiBaseUrl}/api/v1/routes${
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
        : errorJson?.message || "Không thể tải danh sách tuyến đường.";
      throw new Error(msg);
    }

    const json = await res.json();
    const responseData = json.data || json;

    // Resilient parsing for data array
    const rawList = Array.isArray(responseData?.data)
      ? responseData.data
      : Array.isArray(responseData)
        ? responseData
        : [];

    const routeEntities = rawList.map((item: any) =>
      RouteEntity.fromApiResponse(item)
    );

    // Resilient parsing for pagination metadata
    const rawPagination = responseData?.pagination || json?.pagination || {};

    const pagination = {
      page: Number(rawPagination.page) || params?.page || 1,
      limit: Number(rawPagination.limit) || params?.limit || 10,
      total:
        Number(rawPagination.total ?? rawPagination.totalItems) ||
        routeEntities.length,
      totalPages: Number(rawPagination.totalPages) || 1,
    };

    return {
      data: routeEntities,
      pagination,
    };
  }

  async createRoute(dto: CreateRouteDTO): Promise<RouteEntity> {
    const token = tokenStorage.getToken();

    // 1. Client-side Domain Validation
    const locValidation = RouteLocationVO.validate(dto.origin, dto.destination);
    if (locValidation.originError) {
      throw new Error(locValidation.originError);
    }
    if (locValidation.destinationError) {
      throw new Error(locValidation.destinationError);
    }
    if (locValidation.matchError) {
      throw new Error(locValidation.matchError);
    }

    const stopsValidation = RouteStopVO.validateStopsList(dto.stops);
    if (!stopsValidation.isValid) {
      throw new Error(
        stopsValidation.error || "Danh sách điểm dừng không hợp lệ."
      );
    }

    // 2. Prepare payload
    const payload = {
      origin: dto.origin.trim(),
      destination: dto.destination.trim(),
      stops: dto.stops.map((s) => ({
        name: s.name.trim(),
        order: Number(s.order),
      })),
    };

    const res = await fetch(`${this.apiBaseUrl}/api/v1/routes`, {
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

    if (!res.ok) {
      const errorJson = await res.json().catch(() => null);
      const msg = Array.isArray(errorJson?.message)
        ? errorJson.message.join(", ")
        : errorJson?.message || "Tạo tuyến đường mới thất bại.";
      throw new Error(msg);
    }

    const json = await res.json();
    const createdData = json.data || json;
    return RouteEntity.fromApiResponse(createdData);
  }

  async updateRouteStatus(
    id: string,
    status: RouteStatus
  ): Promise<RouteEntity> {
    const token = tokenStorage.getToken();

    const res = await fetch(`${this.apiBaseUrl}/api/v1/routes/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status }),
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
        : errorJson?.message || "Cập nhật trạng thái tuyến đường thất bại.";
      throw new Error(msg);
    }

    const json = await res.json();
    const updatedData = json.data || json;
    return RouteEntity.fromApiResponse(updatedData);
  }
}
