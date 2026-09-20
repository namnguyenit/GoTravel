import type { TripEntity } from "../../domain/entity/trip.entity";
import type { TripStatus } from "../../domain/value-object/trip-status.vo";

export interface CreateTripDTO {
  routeId: string;
  carId: string;
  departureTime: string;
  arrivalTime: string;
  pricePerSeat: number;
}

export interface GetTripsParams {
  keyword?: string;
  status?: TripStatus | "";
  routeId?: string;
  carId?: string;
  departureDate?: string;
  page?: number;
  limit?: number;
  sortBy?: "departureTime" | "pricePerSeat" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface TripKpiStats {
  totalTrips: number;
  scheduledTrips: number;
  departedTrips: number;
  completedTrips: number;
  cancelledTrips: number;
}

export interface TripPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetTripsResult {
  data: TripEntity[];
  kpi: TripKpiStats;
  pagination: TripPaginationMeta;
}

export interface ITripService {
  getTrips(params?: GetTripsParams): Promise<GetTripsResult>;
  createTrip(dto: CreateTripDTO): Promise<TripEntity>;
  updateTripStatus(tripId: string, status: TripStatus): Promise<TripEntity>;
}
