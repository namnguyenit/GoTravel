export interface UpdateDraftTripInput {
  tripId: string;
  userId: string;
  dto: {
    carId?: string;
    routeId?: string;
    departureTime?: string;
    arrivalTime?: string;
    priceVnd?: string;
  };
}

export interface IUpdateDraftTripUseCase {
  execute(input: UpdateDraftTripInput): Promise<any>;
}
