import { CarService } from "../application/service/car.service";
import type { ICarService } from "../application/port/car.service.interface";

const API_BASE_URL =
  import.meta.env.VITE_API_GATEWAY_URL || "";

export const carService: ICarService = new CarService(API_BASE_URL);
