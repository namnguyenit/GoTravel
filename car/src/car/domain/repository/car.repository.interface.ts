import { Car } from '../entity/car.entity';
import { CarType } from '../value-object/car-type.enum';

export interface CarFilterParams {
  operatorId: string;
  keyword?: string;
  type?: CarType;
  sortBy?: 'createdAt' | 'name' | 'totalSeats';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CarListQueryResult {
  cars: Car[];
  total: number;
  kpi: {
    totalCars: number;
    sleeperCars: number;
    limousineCars: number;
    seatCars: number;
  };
}

export interface CarDetailResult {
  car: Car;
  seatTemplates: Array<{
    id: string;
    code: string;
    level: number;
    seatClass: string;
    active: boolean;
    row: number;
    column: number;
  }>;
}

export interface ICarRepository {
  save(car: Car, layout?: { deckCount: number; lowerDeckSeats: number; seatClass: string; seatColumns?: number }): Promise<Car>;
  archiveOwned(id: string, ownerUserId: string): Promise<void>;
  mutateOwned(
    id: string,
    ownerUserId: string,
    mutate: (car: Car) => void,
    requireNoActiveTrips: boolean,
  ): Promise<Car>;
  findByLicensePlate(licensePlate: string): Promise<Car | null>;
  findById(id: string): Promise<Car | null>;
  findByIdWithSeats(id: string): Promise<CarDetailResult | null>;
  findOperatorIdByUserId(userId: string): Promise<string | null>;
  findManyWithFilters(params: CarFilterParams): Promise<CarListQueryResult>;
  countActiveTripsByCarId(carId: string): Promise<number>;
}
