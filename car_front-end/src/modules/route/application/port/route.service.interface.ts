import type { RouteEntity } from "../../domain/entity/route.entity";
import type { RouteStatus } from "../../domain/value-object/route-status.vo";

export interface CreateRouteStopDTO {
  name: string;
  order: number;
}

export interface CreateRouteDTO {
  origin: string;
  destination: string;
  stops: CreateRouteStopDTO[];
}

export interface GetRoutesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: RouteStatus | "";
  sortBy?: "createdAt" | "origin" | "destination";
  sortOrder?: "asc" | "desc";
}

export interface RoutePaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetRoutesResult {
  data: RouteEntity[];
  pagination: RoutePaginationMeta;
}

export interface IRouteService {
  getRoutes(params?: GetRoutesParams): Promise<GetRoutesResult>;
  createRoute(dto: CreateRouteDTO): Promise<RouteEntity>;
  updateRouteStatus(id: string, status: RouteStatus): Promise<RouteEntity>;
}
