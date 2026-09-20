import { TripStatus } from '../../domain/value-object/trip-status.enum';

export interface TripOccupancyOutput {
  bookedSeats: number;
  availableSeats: number;
  occupancyRate: number;
}

export interface TripRouteOutput {
  id: string;
  origin: string;
  destination: string;
}

export interface TripCarOutput {
  id: string;
  name: string;
  licensePlate: string;
  type: string;
  totalSeats: number;
}

export interface TripItemOutput {
  id: string;
  operatorId: string;
  departureTime: Date;
  arrivalTime: Date;
  pricePerSeat: number;
  status: TripStatus;
  route: TripRouteOutput;
  car: TripCarOutput;
  occupancy: TripOccupancyOutput;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripPaginationOutput {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TripKpiOutput {
  totalTrips: number;
  scheduledTrips: number;
  departedTrips: number;
  completedTrips: number;
  cancelledTrips: number;
}

export interface GetTripsOutput {
  kpi: TripKpiOutput;
  pagination: TripPaginationOutput;
  data: TripItemOutput[];
}
