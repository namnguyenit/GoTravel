import { TripStatus } from '../../domain/value-object/trip-status.enum';

export interface GetTripsInput {
  userId: string;
  keyword?: string;
  status?: TripStatus;
  routeId?: string;
  carId?: string;
  departureDate?: string;
  sortBy?: 'departureTime' | 'pricePerSeat' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
