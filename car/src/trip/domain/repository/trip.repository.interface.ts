import { Trip } from '../entity/trip.entity';
import { TripStatus } from '../value-object/trip-status.enum';

export interface TripFilterParams {
  operatorId: string;
  keyword?: string;
  status?: TripStatus;
  routeId?: string;
  carId?: string;
  departureDate?: string;
  sortBy?: 'departureTime' | 'pricePerSeat' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface TripListItem {
  trip: Trip;
  route: {
    id: string;
    origin: string;
    destination: string;
  };
  car: {
    id: string;
    name: string;
    licensePlate: string;
    type: string;
    totalSeats: number;
  };
  bookedSeats: number;
}

export interface TripKpiStats {
  totalTrips: number;
  scheduledTrips: number;
  departedTrips: number;
  completedTrips: number;
  cancelledTrips: number;
}

export interface TripListQueryResult {
  trips: TripListItem[];
  total: number;
  kpi: TripKpiStats;
}

export interface RouteRef {
  id: string;
  operatorId: string;
  status: string;
  origin: string;
  destination: string;
}

export interface CarRef {
  id: string;
  operatorId: string;
  status: string;
  name: string;
  licensePlate: string;
  type: string;
  totalSeats: number;
}

export interface ITripRepository {
  findOperatorIdByUserId(userId: string): Promise<string | null>;
  findRouteById(routeId: string): Promise<RouteRef | null>;
  findCarById(carId: string): Promise<CarRef | null>;
  checkCarScheduleConflict(
    carId: string,
    departureTime: Date,
    arrivalTime: Date,
    excludeTripId?: string,
  ): Promise<boolean>;
  findById(id: string): Promise<Trip | null>;
  save(trip: Trip): Promise<Trip>;
  findManyByOperatorId(params: TripFilterParams): Promise<TripListQueryResult>;
}
