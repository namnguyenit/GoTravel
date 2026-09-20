import { TripStatus } from '../../domain/value-object/trip-status.enum';

export interface UpdateTripStatusInput {
  userId: string;
  tripId: string;
  status: TripStatus;
}
