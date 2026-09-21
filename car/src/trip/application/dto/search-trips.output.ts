import { CustomerTripItem } from '../../domain/repository/trip.repository.interface';

export interface SearchTripsPaginationOutput {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SearchTripsOutput {
  pagination: SearchTripsPaginationOutput;
  data: CustomerTripItem[];
}
