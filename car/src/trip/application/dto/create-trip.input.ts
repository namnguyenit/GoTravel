export interface CreateTripInput {
  userId: string;
  routeId: string;
  carId: string;
  departureTime: string | Date;
  arrivalTime: string | Date;
  pricePerSeat: number;
}
