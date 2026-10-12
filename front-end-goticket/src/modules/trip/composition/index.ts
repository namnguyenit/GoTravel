import { TripService } from "../application/service/trip.service";
import type { ITripService } from "../application/port/trip.service.interface";
import { httpClient } from "@/shared/infrastructure/http/HttpPort";

export const tripService: ITripService = new TripService(httpClient);
