import { Route } from '../entity/route.entity';
import { RouteStatus } from '../value-object/route-status.enum';

export interface RouteFilterParams {
  operatorId: string;
  search?: string;
  status?: RouteStatus;
  sortBy?: 'createdAt' | 'origin' | 'destination';
  sortOrder?: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface RouteListQueryResult {
  routes: Route[];
  total: number;
}

export interface IRouteRepository {
  findOperatorIdByUserId(userId: string): Promise<string | null>;
  findById(id: string): Promise<Route | null>;
  save(route: Route): Promise<Route>;
  updateStatus(id: string, status: RouteStatus): Promise<Route>;
  findManyByOperatorId(params: RouteFilterParams): Promise<RouteListQueryResult>;
}

