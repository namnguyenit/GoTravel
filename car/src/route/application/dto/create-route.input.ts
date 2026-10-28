export interface CreateRouteStopInput {
  name: string;
  order: number;
  address?: string;
  province?: string;
}

export interface CreateRouteInput {
  userId: string;
  origin: string;
  destination: string;
  stops: CreateRouteStopInput[];
}
