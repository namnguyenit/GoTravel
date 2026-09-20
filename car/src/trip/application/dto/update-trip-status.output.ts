import { TripStatus } from '../../domain/value-object/trip-status.enum';

export interface UpdateTripStatusOutput {
  id: string;
  operatorId: string;
  routeId: string;
  carId: string;
  departureTime: Date;
  arrivalTime: Date;
  pricePerSeat: number;
  status: TripStatus;
  createdAt: Date;
  updatedAt: Date;
}
