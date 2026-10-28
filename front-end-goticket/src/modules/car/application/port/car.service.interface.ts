import type { CarEntity } from "../../domain/entity/car.entity";
import type { CarType } from "../../domain/value-object/car-type.vo";
import type { CarStatus } from "../../domain/value-object/car-status.vo";

export interface CreateCarDTO {
  name: string;
  type: CarType;
  licensePlate: string;
  totalSeats: number;
  deckCount?: number;
  seatColumns?: number;
  lowerDeckSeats?: number;
  seatClass?: string;
}

export interface GetCarsParams {
  page?: number;
  limit?: number;
  keyword?: string;
  type?: CarType | "";
  sortBy?: "createdAt" | "name" | "totalSeats";
  sortOrder?: "asc" | "desc";
}

export interface CarKpiMeta {
  totalCars: number;
  sleeperCars: number;
  limousineCars: number;
  seatCars: number;
}

export interface CarPaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface GetCarsResult {
  data: CarEntity[];
  kpi: CarKpiMeta;
  pagination: CarPaginationMeta;
}

export interface ICarService {
  deleteCar(id: string): Promise<void>;
  getCars(params?: GetCarsParams): Promise<GetCarsResult>;
  addCar(dto: CreateCarDTO): Promise<CarEntity>;
  updateCar(id: string, dto: Partial<Pick<CreateCarDTO, 'name' | 'type' | 'licensePlate'>>): Promise<CarEntity>;
  updateCarStatus(id: string, status: CarStatus): Promise<CarEntity>;
}
