import { RouteStopOutput } from './create-route.output';

export interface RouteItemOutput {
  id: string;
  operatorId: string;
  origin: string;
  destination: string;
  status: string;
  stops: RouteStopOutput[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RoutePaginationOutput {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface GetRoutesOutput {
  pagination: RoutePaginationOutput;
  data: RouteItemOutput[];
}
