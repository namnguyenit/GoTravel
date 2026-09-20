import { RouteStatus } from '../../domain/value-object/route-status.enum';

export interface UpdateRouteStatusInput {
  userId: string;
  routeId: string;
  status: RouteStatus;
}
