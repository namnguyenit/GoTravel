import { CarService } from "../application/service/car.service";
import type { ICarService } from "../application/port/car.service.interface";
import { httpClient } from "@/shared/infrastructure/http/HttpPort";

export const carService: ICarService = new CarService(httpClient);
