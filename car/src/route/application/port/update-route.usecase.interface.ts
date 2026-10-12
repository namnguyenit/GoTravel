import { Route } from '../../domain/entity/route.entity';

export interface UpdateRouteInput {
  routeId: string;
  userId: string;
  dto: {
    origin?: string;
    destination?: string;
    stops?: Array<{
      operatorStopId?: string;
      name: string;
      address?: string;
      province?: string;
      order: number;
    }>;
  };
}

export interface IUpdateRouteUseCase {
  execute(input: UpdateRouteInput): Promise<Route>;
}
