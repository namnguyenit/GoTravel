import { TripService } from "../application/service/trip.service";
import type { ITripService } from "../application/port/trip.service.interface";

const API_BASE_URL =
  import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:5555";

export const tripService: ITripService = new TripService(API_BASE_URL);
