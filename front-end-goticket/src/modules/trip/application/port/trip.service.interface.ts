import type { TripEntity } from "../../domain/entity/trip.entity";
import type { CustomerTripEntity } from "../../domain/entity/customer-trip.entity";
import type { SeatEntity } from "../../domain/entity/seat.entity";
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

export interface SearchTripsParams {
  origin: string;
  destination: string;
  departureDate: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  operatorId?: string;
  timeRange?: string; // 'EARLY_MORNING' | 'MORNING' | 'AFTERNOON' | 'EVENING'
  sortBy?: "departureTime" | "pricePerSeat";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface SearchTripsResult {
  data: CustomerTripEntity[];
  pagination: TripPaginationMeta;
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

export interface TripStopItem {
  id: string;
  name: string;
  address?: string;
  province?: string;
  stopType?: "PICKUP" | "DROPOFF" | "BOTH";
  type?: "PICKUP" | "DROPOFF" | "BOTH";
  plannedAt?: string;
  scheduledAt?: string;
  order?: number;
  orderIndex?: number;
  pickupAllowed?: boolean;
  dropoffAllowed?: boolean;
}

export interface TripPublicDetail {
  id: string;
  operatorId: string;
  listingId?: string;
  route: {
    origin: string;
    destination: string;
  };
  departureAt: string;
  arrivalAt: string;
  status: string;
  vehicle?: {
    name: string;
    licensePlate: string;
    type: string;
    amenities?: string[];
  };
  operator?: {
    name: string;
    phone?: string;
    address?: string;
  };
  inventorySyncPending?: boolean;
  saleEnabled?: boolean;
  totalSeats: number;
  fromPriceVnd: string;
  stops: TripStopItem[];
  seatClasses: Array<{ name: string; priceVnd: string }>;
}

export interface ITripService {
  getTrips(params?: GetTripsParams): Promise<GetTripsResult>;
  createTrip(dto: CreateTripDTO): Promise<TripEntity>;
  updateTripStatus(tripId: string, status: TripStatus): Promise<TripEntity>;
  searchTrips(params: SearchTripsParams): Promise<SearchTripsResult>;
  getLocations(): Promise<string[]>;
  getTripDetail(tripId: string): Promise<TripPublicDetail>;
  getTripSeats(tripId: string): Promise<SeatEntity[]>;
  getTripStops(tripId: string): Promise<TripStopItem[]>;
  getAssignedStaffTrips(): Promise<TripEntity[]>;
}
