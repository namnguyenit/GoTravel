import { TripStatus } from '../../domain/value-object/trip-status.enum';

export interface UpdateTripStatusOutput {
  inventorySyncPending?: boolean;
  id: string;
  operatorId: string;
  routeId: string;
  carId: string;
  departureTime: Date;
  arrivalTime: Date;
  pricePerSeat: number;
  priceVnd?: string;
  status: TripStatus;
  createdAt: Date;
  updatedAt: Date;
}
