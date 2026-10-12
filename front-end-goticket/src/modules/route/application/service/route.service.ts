import type {
  IRouteService,
  GetRoutesParams,
  GetRoutesResult,
  CreateRouteDTO,
} from "../port/route.service.interface";
import { RouteEntity } from "../../domain/entity/route.entity";
import type { RouteStatus } from "../../domain/value-object/route-status.vo";
import { RouteLocationVO } from "../../domain/value-object/route-location.vo";
import { RouteStopVO } from "../../domain/value-object/route-stop.vo";
import {
  httpClient,
  type IHttpClient,
} from "@/shared/infrastructure/http/HttpPort";

export class RouteService implements IRouteService {
  private readonly http: IHttpClient;
  private cachedLocations: string[] | null = null;

  constructor(http: IHttpClient = httpClient) {
    this.http = http;
  }

  async getRoutes(params?: GetRoutesParams): Promise<GetRoutesResult> {
    const queryParams: Record<string, string | number | undefined> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.search?.trim()) queryParams.search = params.search.trim();
    if (params?.status?.trim()) queryParams.status = params.status.trim();
    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;

    const responseData = await this.http.get<any>("/api/v1/routes", {
      params: queryParams,
    });

    const rawList = Array.isArray(responseData?.data)
      ? responseData.data
      : Array.isArray(responseData)
        ? responseData
        : [];

    const routeEntities = rawList.map((item: any) =>
      RouteEntity.fromApiResponse(item)
    );

    const rawPagination = responseData?.pagination || {};
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

  async getRouteById(id: string): Promise<RouteEntity | null> {
    if (!id?.trim()) return null;
    try {
      const res = await this.http.get<any>(`/api/v1/routes/${id.trim()}`);
      return RouteEntity.fromApiResponse(res?.data || res);
    } catch {
      return null;
    }
  }

  async createRoute(dto: CreateRouteDTO): Promise<RouteEntity> {
    const locValidation = RouteLocationVO.validate(dto.origin, dto.destination);
    if (locValidation.originError) throw new Error(locValidation.originError);
    if (locValidation.destinationError)
      throw new Error(locValidation.destinationError);
    if (locValidation.matchError) throw new Error(locValidation.matchError);

    const rawStops = Array.isArray(dto.stops) ? dto.stops : [];
    const stopValidation = RouteStopVO.validateStopsList(rawStops);
    if (!stopValidation.isValid)
      throw new Error(
        stopValidation.error || "Danh sách trạm dừng không hợp lệ."
      );

    const payload = {
      origin: dto.origin.trim(),
      destination: dto.destination.trim(),
      stops: rawStops.map((s, idx) => ({
        name: s.name.trim(),
        order: s.order ?? idx + 1,
      })),
    };

    const createdData = await this.http.post<any>("/api/v1/routes", payload);
    return RouteEntity.fromApiResponse(createdData?.data || createdData);
  }

  async updateRouteStatus(
    id: string,
    status: RouteStatus
  ): Promise<RouteEntity> {
    if (!id?.trim()) throw new Error("Mã tuyến đường không hợp lệ.");
    const res = await this.http.patch<any>(
      `/api/v1/routes/${id.trim()}/status`,
      { status }
    );
    return RouteEntity.fromApiResponse(res?.data || res);
  }

  async updateRoute(
    id: string,
    dto: Partial<CreateRouteDTO>
  ): Promise<RouteEntity> {
    if (!id?.trim()) throw new Error("Mã tuyến đường không hợp lệ.");
    if (dto.origin && dto.destination) {
      const validation = RouteLocationVO.validate(dto.origin, dto.destination);
      const validationError =
        validation.originError ||
        validation.destinationError ||
        validation.matchError;
      if (validationError) throw new Error(validationError);
    }
    if (dto.stops) {
      const validation = RouteStopVO.validateStopsList(dto.stops);
      if (!validation.isValid)
        throw new Error(
          validation.error || "Danh sách trạm dừng không hợp lệ."
        );
    }
    const payload = {
      ...dto,
      origin: dto.origin?.trim(),
      destination: dto.destination?.trim(),
      stops: dto.stops?.map((stop, index) => ({
        name: stop.name.trim(),
        order: index,
      })),
    };
    const res = await this.http.patch<any>(
      `/api/v1/routes/${id.trim()}`,
      payload
    );
    return RouteEntity.fromApiResponse(res?.data || res);
  }

  async getLocations(): Promise<string[]> {
    if (this.cachedLocations && this.cachedLocations.length > 0) {
      return this.cachedLocations;
    }

    try {
      const res = await this.http.get<any>("/api/v1/routes/locations");
      const list: unknown[] = Array.isArray(res?.data?.locations)
        ? res.data.locations
        : Array.isArray(res?.locations)
          ? res.locations
          : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];
      const rawStrings = list
        .filter((item: unknown): item is string => typeof item === "string")
        .map((item: string) => item.trim())
        .filter(Boolean);

      const locationMap = new Map<string, string>();
      for (const loc of rawStrings) {
        // Standardize key without accents and lowercase for deduplication
        const key = loc
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .replace(/đ/gi, "d")
          .toLowerCase()
          .trim();

        // Capitalize first letter of each word for clean display (e.g. "Hà Nội", "Đà Lạt")
        const formatted = loc
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

        const existing = locationMap.get(key);
        if (!existing) {
          locationMap.set(key, formatted);
        } else {
          // Prefer Title Case / more uppercase letters
          const existingUpper = (existing.match(/[A-ZÀ-Ỹ]/g) || []).length;
          const currentUpper = (formatted.match(/[A-ZÀ-Ỹ]/g) || []).length;
          if (currentUpper > existingUpper) {
            locationMap.set(key, formatted);
          }
        }
      }

      const sanitized: string[] = Array.from(locationMap.values()).sort((a, b) =>
        a.localeCompare(b, "vi")
      );
      this.cachedLocations = sanitized;
      return sanitized;
    } catch {
      return [];
    }
  }
}
