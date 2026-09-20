export interface RouteStopOutput {
  id: string;
  name: string;
  order: number;
}

export interface CreateRouteOutput {
  id: string;
  operatorId: string;
  origin: string;
  destination: string;
  status: string;
  stops: RouteStopOutput[];
  createdAt: Date;
  updatedAt: Date;
}
