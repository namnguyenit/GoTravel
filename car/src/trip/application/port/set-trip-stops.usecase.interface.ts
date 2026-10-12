export interface SetTripStopsInput {
  tripId: string;
  userId: string;
  dto: {
    stops: Array<{
      routeStopId: string;
      order: number;
      type?: 'PICKUP' | 'DROPOFF' | 'BOTH';
      scheduledAt?: string;
      pickupAllowed?: boolean;
      dropoffAllowed?: boolean;
    }>;
  };
}

export interface ISetTripStopsUseCase {
  execute(input: SetTripStopsInput): Promise<any>;
}
