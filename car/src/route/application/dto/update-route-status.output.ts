export interface UpdateRouteStatusOutput {
  id: string;
  operatorId: string;
  origin: string;
  destination: string;
  status: string;
  stops: import('./create-route.output').RouteStopOutput[];
  createdAt: Date;
  updatedAt: Date;
}
