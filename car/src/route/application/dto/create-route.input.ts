export interface CreateRouteStopInput {
  name: string;
  order: number;
}

export interface CreateRouteInput {
  userId: string;
  origin: string;
  destination: string;
  stops: CreateRouteStopInput[];
}
